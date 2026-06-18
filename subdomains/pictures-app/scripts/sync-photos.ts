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
 *   2. ONLY THEN aggregates to public/photos/: copies the JPG (carries the
 *      synced metadata) and the raw .xmp sidecar (carries the crs: edits),
 *      re-copying whenever the source changed.
 *   3. Uploads the matching .arw to Firebase Storage (once per photo).
 *   4. Runs npm run generate.
 *
 * Deduplication guarantees:
 *   - Metadata is written only when the JPG and XMP differ (no churn on re-run).
 *   - JPG / .xmp copied to public only when missing or changed.
 *   - ARW uploaded only if no rawUrl is recorded for the slug (idempotent).
 *   - One entry per slug in photos.overrides.json (keyed dict, not array).
 */

import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, extname, resolve } from 'path'
import { randomUUID } from 'crypto'
import { ExifTool } from 'exiftool-vendored'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { readMeta, writeMeta, metaEqual } from './metadata'

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

async function uploadRaw(localPath: string, destName: string): Promise<string> {
  const token = randomUUID()
  const destination = `raw/${destName}`
  await bucket.upload(localPath, {
    destination,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`
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

  let changed = 0
  let unchanged = 0

  try {
    for (const file of savedFiles) {
      const stem = basename(file, extname(file))
      const slug = deriveSlug(file)
      const jpgSrc = join(SAVED_PHOTOS_DIR, file)
      const destJpg = join(PUBLIC_PHOTOS_DIR, file)
      const destXmp = join(PUBLIC_PHOTOS_DIR, stem + '.xmp')
      const xmpSrc = findByBasename(RAW_SEARCH_DIR, stem, '.xmp')

      const actions: string[] = []

      // 1. Two-way metadata sync (most-recently-modified file wins).
      //    Only writes when the two files' managed metadata actually differs.
      if (xmpSrc) {
        const jpgMeta = await readMeta(exiftool, jpgSrc)
        const xmpMeta = await readMeta(exiftool, xmpSrc)
        if (!metaEqual(jpgMeta, xmpMeta)) {
          const jpgMtime = statSync(jpgSrc).mtimeMs
          const xmpMtime = statSync(xmpSrc).mtimeMs
          if (jpgMtime >= xmpMtime) {
            await writeMeta(exiftool, xmpSrc, jpgMeta) // JPG newer → push into XMP
            actions.push('meta→xmp')
          } else {
            await writeMeta(exiftool, jpgSrc, xmpMeta) // XMP newer → push into JPG
            actions.push('meta→jpg')
          }
        }
      }

      // 2. Only AFTER syncing, aggregate to public/photos.
      if (copyIfChanged(jpgSrc, destJpg)) actions.push('jpg')
      if (xmpSrc && copyIfChanged(xmpSrc, destXmp)) actions.push('xmp')

      // 3. Upload the ARW once (idempotent via overrides).
      const alreadyHasRaw = typeof overrides[slug]?.rawUrl === 'string'
      if (!alreadyHasRaw) {
        const arwSrc = findByBasename(RAW_SEARCH_DIR, stem, '.arw')
        if (arwSrc) {
          console.log(`\n  ${file}: uploading arw… (this may take a moment)`)
          const rawUrl = await uploadRaw(arwSrc, basename(arwSrc))
          overrides[slug] = { ...(overrides[slug] ?? {}), rawUrl }
          actions.push('raw→firebase')
          console.log(`        uploaded → ${rawUrl.slice(0, 80)}…`)
        }
      }

      if (actions.length > 0) {
        console.log(`  sync  ${file}  [${actions.join(', ')}]`)
        changed++
      } else {
        unchanged++
      }
    }
  } finally {
    await exiftool.end()
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
