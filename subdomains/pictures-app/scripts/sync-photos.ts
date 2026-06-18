/**
 * sync-photos.ts
 *
 * Run after exporting JPGs from Lightroom (and after editing metadata —
 * Title, Caption, Rating, Keywords, Extended Description — on those exported
 * JPGs in Lightroom):
 *
 *   npm run sync
 *
 * For each JPG in SAVED_PHOTOS_DIR it:
 *   1. Two-way metadata sync between the raw .xmp sidecar and the exported JPG,
 *      whichever was modified more recently wins. The managed fields are title,
 *      caption, rating, keywords, "Extended Description", and alt text. Editing
 *      instructions (crs:*) live only in the XMP and are never touched.
 *      Nothing is written unless the two files actually differ.
 *   2. Folder collection tags. Exported photos are grouped by their raw
 *      subfolder. In each folder the earliest-dated photo is the "defining"
 *      photo, and its first keyword (verbatim) becomes the folder's collection
 *      tag, pushed to the FRONT of every other photo's keyword list.
 *        - "nc" (isolated, in the Extended Description, space-separated from
 *          "size:") on a photo → it is skipped (tag never auto-added; an
 *          already-present tag is left in place).
 *        - "nc" on the defining photo → the folder gets no auto tag, and the
 *          tag is removed from every OTHER photo where it sits as the first
 *          keyword (rolling back earlier auto-adds). The defining photo keeps
 *          its own keyword.
 *        - "rc" (remove collection) on the defining photo → the collection tag
 *          is removed from every OTHER photo in the folder at ANY position (a
 *          harder purge than "nc", which only removes it from the first slot).
 *          The defining photo keeps its own keywords, so remove the tag there
 *          manually if you want the collection gone entirely. Takes precedence
 *          over "nc" and over auto-adding.
 *   3. ONLY THEN aggregates to public/photos/: copies the JPG (carries the
 *      synced metadata) and the raw .xmp sidecar (carries the crs: edits),
 *      re-copying whenever the source changed.
 *   4. Uploads the matching .arw to Firebase Storage (once per photo).
 *   5. Runs npm run generate.
 *
 * Deduplication guarantees:
 *   - Metadata is written only when the JPG and XMP differ (no churn on re-run).
 *   - JPG / .xmp copied to public only when missing or changed.
 *   - ARW uploaded only if no rawUrl is recorded for the slug (idempotent).
 *   - One entry per slug in photos.overrides.json (keyed dict, not array).
 */

import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, extname, resolve, dirname } from 'path'
import { randomUUID } from 'crypto'
import { ExifTool } from 'exiftool-vendored'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { readMeta, writeMeta, metaEqual, type Meta } from './metadata'

// ── Configuration ─────────────────────────────────────────────────────────────

const SAVED_PHOTOS_DIR = '/Users/benwilcox/Desktop/Everything/Pictures/Saved Photos'
const RAW_SEARCH_DIR = '/Users/benwilcox/Desktop/Everything/Pictures'
const PROJECT_ROOT = join(import.meta.dirname, '..')
const PUBLIC_PHOTOS_DIR = join(PROJECT_ROOT, 'public/photos')
const OVERRIDES_FILE = join(PROJECT_ROOT, 'photos.overrides.json')

// ── Firebase init ──────────────────────────────────────────────────────────────

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) {
  console.error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env')
  process.exit(1)
}

const serviceAccount = JSON.parse(
  readFileSync(resolve(serviceAccountPath.replace(/^~/, process.env.HOME ?? '')), 'utf-8')
)

const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET
if (!storageBucket) {
  console.error('VITE_FIREBASE_STORAGE_BUCKET is not set in .env')
  process.exit(1)
}

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
  storageBucket,
})

const bucket = getStorage().bucket()

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveSlug(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function walkDir(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...walkDir(full))
    else results.push(full)
  }
  return results
}

function findByBasename(searchDir: string, stem: string, ext: string): string | null {
  const target = stem.toLowerCase() + ext.toLowerCase()
  return walkDir(searchDir).find(f => basename(f).toLowerCase() === target) ?? null
}

// Copies src → dest only when dest is missing or differs (size or mtime).
// Returns true if a copy happened.
function copyIfChanged(src: string, dest: string): boolean {
  if (existsSync(dest)) {
    const s = statSync(src)
    const d = statSync(dest)
    if (s.size === d.size && s.mtimeMs <= d.mtimeMs) return false
  }
  copyFileSync(src, dest)
  return true
}

// True if a given isolated token appears in the Extended Description (e.g. "nc",
// "rc"), space-delimited so it never matches inside another word.
function hasToken(extDescr: string | null, token: string): boolean {
  if (!extDescr) return false
  return new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(extDescr)
}

// Capture time in epoch ms (Number.MAX_SAFE_INTEGER when unknown, so undated
// photos sort last and never become the "defining" earliest photo).
async function readDate(et: ExifTool, path: string): Promise<number> {
  const t = (await et.read(path)) as unknown as Record<string, unknown>
  const raw = t.DateTimeOriginal ?? t.CreateDate
  if (!raw) return Number.MAX_SAFE_INTEGER
  const a = raw as { toMillis?: () => number; toDate?: () => Date }
  let ms: number
  if (typeof a.toMillis === 'function') ms = a.toMillis()
  else if (typeof a.toDate === 'function') ms = a.toDate().getTime()
  else if (raw instanceof Date) ms = raw.getTime()
  else ms = new Date(String(raw)).getTime()
  return isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms
}

function sameKeywords(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

async function uploadRaw(localPath: string, destName: string): Promise<string> {
  const token = randomUUID()
  const destination = `raw/${destName}`
  await bucket.upload(localPath, {
    destination,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`
}

// Per-photo working state carried across the phases below.
interface ImageInfo {
  file: string
  slug: string
  stem: string
  jpgSrc: string
  destJpg: string
  destXmp: string
  xmpSrc: string | null
  folder: string | null // raw subfolder that defines the photo's collection
  date: number
  meta: Meta
  nc: boolean
  rc: boolean
  keywordsChanged: boolean
  actions: string[]
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(PUBLIC_PHOTOS_DIR, { recursive: true })

  const overrides: Record<string, Record<string, unknown>> = existsSync(OVERRIDES_FILE)
    ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf-8'))
    : {}

  const savedFiles = readdirSync(SAVED_PHOTOS_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  if (savedFiles.length === 0) {
    console.log(`No images found in ${SAVED_PHOTOS_DIR}`)
    return
  }

  const exiftool = new ExifTool()
  const images: ImageInfo[] = []

  try {
    // ── Phase 1: two-way metadata sync + gather per-photo state ──────────────
    for (const file of savedFiles) {
      const stem = basename(file, extname(file))
      const slug = deriveSlug(file)
      const jpgSrc = join(SAVED_PHOTOS_DIR, file)
      const xmpSrc = findByBasename(RAW_SEARCH_DIR, stem, '.xmp')

      const actions: string[] = []

      // Two-way metadata sync (most-recently-modified file wins). Only writes
      // when the two files' managed metadata actually differs.
      let meta: Meta
      if (xmpSrc) {
        const jpgMeta = await readMeta(exiftool, jpgSrc)
        const xmpMeta = await readMeta(exiftool, xmpSrc)
        if (metaEqual(jpgMeta, xmpMeta)) {
          meta = jpgMeta
        } else if (statSync(jpgSrc).mtimeMs >= statSync(xmpSrc).mtimeMs) {
          await writeMeta(exiftool, xmpSrc, jpgMeta) // JPG newer → push into XMP
          meta = jpgMeta
          actions.push('meta→xmp')
        } else {
          await writeMeta(exiftool, jpgSrc, xmpMeta) // XMP newer → push into JPG
          meta = xmpMeta
          actions.push('meta→jpg')
        }
      } else {
        meta = await readMeta(exiftool, jpgSrc)
      }

      images.push({
        file,
        slug,
        stem,
        jpgSrc,
        destJpg: join(PUBLIC_PHOTOS_DIR, file),
        destXmp: join(PUBLIC_PHOTOS_DIR, stem + '.xmp'),
        xmpSrc,
        folder: xmpSrc ? dirname(xmpSrc) : null,
        date: await readDate(exiftool, jpgSrc),
        meta,
        nc: hasToken(meta.extDescr, 'nc'),
        rc: hasToken(meta.extDescr, 'rc'),
        keywordsChanged: false,
        actions,
      })
    }

    // ── Phase 2: folder collection tags ──────────────────────────────────────
    const byFolder = new Map<string, ImageInfo[]>()
    for (const img of images) {
      if (!img.folder) continue
      const list = byFolder.get(img.folder) ?? []
      list.push(img)
      byFolder.set(img.folder, list)
    }

    for (const imgs of byFolder.values()) {
      const sorted = [...imgs].sort((a, b) => a.date - b.date || a.file.localeCompare(b.file))
      const defining = sorted[0]
      const collectionTag = defining.meta.keywords[0]
      if (!collectionTag) continue // defining photo has no keywords → no collection
      const tagLc = collectionTag.toLowerCase()

      if (defining.rc) {
        // "rc" on the defining photo: purge the tag from every other photo at
        // any position. The defining photo keeps its own keywords.
        for (const img of sorted) {
          if (img === defining) continue
          const next = img.meta.keywords.filter(k => k.toLowerCase() !== tagLc)
          if (!sameKeywords(img.meta.keywords, next)) {
            img.meta.keywords = next
            img.keywordsChanged = true
          }
        }
      } else if (defining.nc) {
        // "nc" on the defining photo: roll back auto-adds on the others.
        for (const img of sorted) {
          if (img === defining) continue
          if (img.meta.keywords[0]?.toLowerCase() === tagLc) {
            img.meta.keywords = img.meta.keywords.slice(1)
            img.keywordsChanged = true
          }
        }
      } else {
        // Push the collection tag to the front of every non-"nc" photo.
        for (const img of sorted) {
          if (img.nc) continue
          const next = [collectionTag, ...img.meta.keywords.filter(k => k.toLowerCase() !== tagLc)]
          if (!sameKeywords(img.meta.keywords, next)) {
            img.meta.keywords = next
            img.keywordsChanged = true
          }
        }
      }
    }

    // Persist collection-tag changes to both the JPG and the raw XMP.
    for (const img of images) {
      if (!img.keywordsChanged) continue
      await writeMeta(exiftool, img.jpgSrc, img.meta)
      if (img.xmpSrc) await writeMeta(exiftool, img.xmpSrc, img.meta)
      img.actions.push('collection-tag')
    }
  } finally {
    await exiftool.end()
  }

  // ── Phase 3: aggregate to public + upload ARW ──────────────────────────────
  let changed = 0
  let unchanged = 0

  for (const img of images) {
    if (copyIfChanged(img.jpgSrc, img.destJpg)) img.actions.push('jpg')
    if (img.xmpSrc && copyIfChanged(img.xmpSrc, img.destXmp)) img.actions.push('xmp')

    const alreadyHasRaw = typeof overrides[img.slug]?.rawUrl === 'string'
    if (!alreadyHasRaw) {
      const arwSrc = findByBasename(RAW_SEARCH_DIR, img.stem, '.arw')
      if (arwSrc) {
        console.log(`\n  ${img.file}: uploading arw… (this may take a moment)`)
        const rawUrl = await uploadRaw(arwSrc, basename(arwSrc))
        overrides[img.slug] = { ...(overrides[img.slug] ?? {}), rawUrl }
        img.actions.push('raw→firebase')
        console.log(`        uploaded → ${rawUrl.slice(0, 80)}…`)
      }
    }

    if (img.actions.length > 0) {
      console.log(`  sync  ${img.file}  [${img.actions.join(', ')}]`)
      changed++
    } else {
      unchanged++
    }
  }

  writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2) + '\n')
  console.log(`\nOverrides saved → photos.overrides.json`)

  console.log('Regenerating photos.ts + collections.ts…')
  execSync('npm run generate', { cwd: PROJECT_ROOT, stdio: 'inherit' })

  console.log(`\nDone. ${changed} updated, ${unchanged} unchanged.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
