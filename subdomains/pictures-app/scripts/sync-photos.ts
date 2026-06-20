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
 *   1. JPG-authoritative metadata sync between the raw .xmp sidecar and the
 *      exported JPG. The exported JPG is the single source of truth for all
 *      display/managed fields: title, caption, rating, keywords, "Extended
 *      Description", and alt text. Clearing a field on the JPG clears it in
 *      the XMP — there is no "most-recently-modified wins" resurrection.
 *      Editing instructions (crs:*) live only in the XMP and are never
 *      touched. Nothing is written unless the two files actually differ.
 *
 *      The COLLECTION TAG is the one exception to the symmetric sync. In each
 *      raw subfolder the "defining" photo is the earliest-dated photo physically
 *      in that folder (exported or not); its first keyword (verbatim) is the
 *      folder's collection tag. That tag is projected onto the FRONT of every
 *      exported JPG's keyword list, but is NEVER written into a raw .xmp sidecar
 *      — the collection name must not pollute the raw library. (The defining
 *      photo is the sole place the name legitimately lives in raw, because the
 *      user typed it there as the source of truth.) Because the tag is a pure
 *      projection re-derived every run, it self-corrects and never duplicates.
 *
 *      Opt-out tokens in the Extended Description (isolated, space-separated
 *      from "size:"), honoured on an individual photo OR the defining photo:
 *        - "nc" (no collection) → that JPG does not get the collection tag
 *          auto-added (a manually-placed copy elsewhere in its tags is left be).
 *          On the defining photo this suppresses the tag for the whole folder.
 *        - "rc" (remove collection) → like "nc" but also strips the collection
 *          tag from ANY position in that JPG's keywords. On the defining photo
 *          it purges the tag from every exported JPG in the folder. The defining
 *          photo always keeps its own keywords.
 *   2. ONLY THEN aggregates to public/photos/: copies the JPG (carries the
 *      synced metadata + projected collection tag) and the raw .xmp sidecar
 *      (carries the crs: edits, collection-free), re-copying when changed.
 *   3. Uploads the matching .arw to Firebase Storage (once per photo).
 *   4. Runs npm run generate.
 *
 * Deduplication guarantees:
 *   - Metadata is written only when a file's managed metadata actually differs
 *     from its synced/projected target (no churn on re-run).
 *   - JPG / .xmp copied to public only when missing or changed.
 *   - ARW uploaded only if no rawUrl is recorded for the slug (idempotent).
 *   - One entry per slug in photos.overrides.json (keyed dict, not array).
 */

import { execSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, extname, resolve, dirname } from 'path'
import { ExifTool } from 'exiftool-vendored'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { readMeta, writeMeta, type Meta } from './metadata'
import { resolveDisplayMeta } from './display-meta'
import { storageObjectPath, buildStorageUrl, type StorageKind } from '../src/utils/storageUrls'

// ── Configuration ─────────────────────────────────────────────────────────────

const SAVED_PHOTOS_DIR = '/Users/benwilcox/Desktop/Everything/Pictures/Saved Photos'
const RAW_SEARCH_DIR = '/Users/benwilcox/Desktop/Everything/Pictures'
const PROJECT_ROOT = join(import.meta.dirname, '..')
const PUBLIC_PHOTOS_DIR = join(PROJECT_ROOT, 'public/photos')
// Gitignored derivative cache that `generate` writes thumb/display WebPs into.
const CACHE_DIR = join(PROJECT_ROOT, '.image-cache')
const OVERRIDES_FILE = join(PROJECT_ROOT, 'photos.overrides.json')
const PHOTOS_TS = join(PROJECT_ROOT, 'src/content/photos.ts')
// Local-only fingerprint cache so unchanged photos skip all exiftool work.
const CACHE_FILE = join(PROJECT_ROOT, '.sync-cache.json')

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

// Indexes RAW_SEARCH_DIR once (lower-cased basename → full path) so sidecar/ARW
// lookups are O(1) instead of re-walking the whole tree per photo. First match
// wins on duplicate basenames.
function buildRawIndex(searchDir: string): Map<string, string> {
  const index = new Map<string, string>()
  for (const f of walkDir(searchDir)) {
    const key = basename(f).toLowerCase()
    if (!index.has(key)) index.set(key, f)
  }
  return index
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

// Order-sensitive metadata equality (keyword ORDER matters for the collection
// tag, which must sit first). Use this — not metadata.metaEqual, which sorts
// keywords — anywhere a write decision depends on keyword position.
function metaEqualStrict(a: Meta, b: Meta): boolean {
  return (
    a.title === b.title &&
    a.caption === b.caption &&
    a.rating === b.rating &&
    a.extDescr === b.extDescr &&
    a.altText === b.altText &&
    sameKeywords(a.keywords, b.keywords)
  )
}

// Returns the keyword list with every occurrence of `tagLc` (a lower-cased tag)
// removed — case-insensitive.
function withoutTag(keywords: string[], tagLc: string): string[] {
  if (!tagLc) return keywords
  return keywords.filter(k => k.toLowerCase() !== tagLc)
}

// Raw image extensions that count as a "photo" when scanning a subfolder for the
// earliest (collection-defining) capture.
const RAW_PHOTO_RE = /\.(arw|dng|raf|nef|cr2|cr3|tiff?|jpe?g|png)$/i

// Finds the collection-DEFINING photo of a raw subfolder: the earliest-dated
// photo physically in that folder, whether or not it was ever exported. Its
// metadata (keywords + Extended Description) lives in the .xmp sidecar when one
// exists, else in the raw file itself. Returns null if the folder has no photos.
async function findDefiningPhoto(
  et: ExifTool,
  folder: string,
): Promise<{ stem: string; keywords: string[]; extDescr: string | null } | null> {
  const rawFiles = readdirSync(folder)
    .filter(f => RAW_PHOTO_RE.test(f))
    .map(f => join(folder, f))
  if (rawFiles.length === 0) return null

  let best: { path: string; date: number } | null = null
  for (const path of rawFiles) {
    const date = await readDate(et, path)
    if (
      !best ||
      date < best.date ||
      (date === best.date && basename(path).localeCompare(basename(best.path)) < 0)
    ) {
      best = { path, date }
    }
  }
  if (!best) return null

  const stem = basename(best.path, extname(best.path))
  const sidecar = join(folder, stem + '.xmp')
  const m = await readMeta(et, existsSync(sidecar) ? sidecar : best.path)
  return { stem, keywords: m.keywords, extDescr: m.extDescr }
}

// Cache window for uploaded image/binary objects. Deliberately SHORT (1 hour,
// NOT immutable) because objects are overwritten in place at fixed slug paths on
// every re-export — a long/immutable cache would pin stale derivatives.
const UPLOAD_CACHE_CONTROL = 'public, max-age=3600'

// Uploads a local file to the public bucket at a fixed slug-based path,
// overwriting in place, and returns its clean public URL. Thin wrapper over the
// Admin SDK; the path/URL logic lives in the pure storageUrls helpers.
async function uploadObject(localPath: string, slug: string, kind: StorageKind): Promise<string> {
  const destination = storageObjectPath(slug, kind)
  await bucket.upload(localPath, {
    destination,
    metadata: { cacheControl: UPLOAD_CACHE_CONTROL },
  })
  return buildStorageUrl(bucket.name, slug, kind)
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
  actions: string[]
}

// Per-folder collection identity, resolved from the defining (earliest) photo.
interface FolderCollection {
  stem: string // stem of the defining photo (so we never rewrite it)
  tag: string | null // collection tag = defining photo's first keyword
  nc: boolean // "nc" on the defining photo → suppress folder-wide
  rc: boolean // "rc" on the defining photo → purge folder-wide
}

function sameFolderCollection(a: FolderCollection, b: FolderCollection): boolean {
  return a.stem === b.stem && a.tag === b.tag && a.nc === b.nc && a.rc === b.rc
}

// ── Change-detection cache ──────────────────────────────────────────────────
// Cheap (stat-only) fingerprints persisted between runs so unchanged photos and
// folders skip all exiftool work.
interface ImgFingerprint {
  jpgMtime: number
  jpgSize: number
  xmpMtime: number | null
  xmpSize: number | null
}
interface FolderCacheEntry {
  fingerprint: string // stat fingerprint of the folder's raw + .xmp files
  defining: FolderCollection
}
interface SyncCache {
  folders: Record<string, FolderCacheEntry>
  images: Record<string, ImgFingerprint>
}

function loadCache(): SyncCache {
  if (!existsSync(CACHE_FILE)) return { folders: {}, images: {} }
  try {
    const c = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
    return { folders: c.folders ?? {}, images: c.images ?? {} }
  } catch {
    return { folders: {}, images: {} }
  }
}

// stat-only fingerprint of every raw-photo and .xmp file in a folder (non-
// recursive). Changes whenever a file is added, removed, or rewritten — which
// is exactly when the defining photo / collection tag could differ.
function folderFingerprint(folder: string): string {
  const parts: string[] = []
  for (const name of readdirSync(folder).sort()) {
    if (!RAW_PHOTO_RE.test(name) && !/\.xmp$/i.test(name)) continue
    const s = statSync(join(folder, name))
    parts.push(`${name}:${s.mtimeMs}:${s.size}`)
  }
  return parts.join('|')
}

function imgFingerprint(jpgSrc: string, xmpSrc: string | null): ImgFingerprint {
  const j = statSync(jpgSrc)
  const x = xmpSrc ? statSync(xmpSrc) : null
  return { jpgMtime: j.mtimeMs, jpgSize: j.size, xmpMtime: x?.mtimeMs ?? null, xmpSize: x?.size ?? null }
}

function sameImgFingerprint(a: ImgFingerprint, b: ImgFingerprint): boolean {
  return a.jpgMtime === b.jpgMtime && a.jpgSize === b.jpgSize && a.xmpMtime === b.xmpMtime && a.xmpSize === b.xmpSize
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

  const cache = loadCache()
  const rawIndex = buildRawIndex(RAW_SEARCH_DIR)
  const lookupRaw = (stem: string, ext: string) => rawIndex.get((stem + ext).toLowerCase()) ?? null

  const exiftool = new ExifTool()
  const images: ImageInfo[] = []
  const folderCollections = new Map<string, FolderCollection>()
  const newImageCache: Record<string, ImgFingerprint> = {}

  try {
    // ── Resolve every exported image to its raw .xmp sidecar / folder ────────
    for (const file of savedFiles) {
      const stem = basename(file, extname(file))
      const xmpSrc = lookupRaw(stem, '.xmp')
      images.push({
        file,
        slug: deriveSlug(file),
        stem,
        jpgSrc: join(SAVED_PHOTOS_DIR, file),
        destJpg: join(PUBLIC_PHOTOS_DIR, file),
        destXmp: join(PUBLIC_PHOTOS_DIR, stem + '.xmp'),
        xmpSrc,
        folder: xmpSrc ? dirname(xmpSrc) : null,
        actions: [],
      })
    }

    // ── Resolve each raw subfolder's collection identity ─────────────────────
    // The defining photo is the earliest-dated photo physically in the folder
    // (exported or not); its first keyword is the collection tag and its
    // Extended Description supplies the folder-level nc/rc tokens.
    //
    // Reuse the cached identity when the folder's files are byte-for-byte
    // unchanged (skips reading capture dates / keywords via exiftool). A folder
    // counts as "changed" only when its resolved collection differs from last
    // run — then every photo in it is reprocessed even if its own files are
    // untouched (the projected tag may need updating).
    const folders = new Set(
      images.map(i => i.folder).filter((f): f is string => f !== null),
    )
    const folderChanged = new Map<string, boolean>()
    for (const folder of folders) {
      const fp = folderFingerprint(folder)
      const prev = cache.folders[folder]
      let defining: FolderCollection
      if (prev && prev.fingerprint === fp) {
        defining = prev.defining // folder untouched → no exiftool
      } else {
        const d = await findDefiningPhoto(exiftool, folder)
        defining = d
          ? { stem: d.stem, tag: d.keywords[0] ?? null, nc: hasToken(d.extDescr, 'nc'), rc: hasToken(d.extDescr, 'rc') }
          : { stem: '', tag: null, nc: false, rc: false }
      }
      folderCollections.set(folder, defining)
      folderChanged.set(folder, !prev || !sameFolderCollection(prev.defining, defining))
    }

    // ── Collection-aware JPG-authoritative sync (unchanged photos skipped) ──────
    // Skip a photo entirely (no exiftool reads/writes) when neither it nor its
    // folder's collection identity changed since the last run. Otherwise the
    // exported JPG is the single source of truth for all display fields
    // (title, caption, rating, keywords, extDescr, altText): clearing a field on
    // the JPG clears it in the XMP — no "most-recently-modified wins" resurrection.
    // The collection tag stays OUT of the raw sidecar, as before.
    for (const img of images) {
      const fp = imgFingerprint(img.jpgSrc, img.xmpSrc)
      const prev = cache.images[img.slug]
      const folderDirty = img.folder ? (folderChanged.get(img.folder) ?? false) : false
      if (!img.xmpSrc || (prev && sameImgFingerprint(prev, fp) && !folderDirty)) {
        newImageCache[img.slug] = fp // unchanged, or no raw counterpart → nothing to do
        continue
      }

      const jpgMeta = await readMeta(exiftool, img.jpgSrc)
      const xmpMeta = await readMeta(exiftool, img.xmpSrc)
      const coll = img.folder ? folderCollections.get(img.folder) : undefined
      const tag = coll?.tag ?? null
      const tagLc = tag?.toLowerCase() ?? ''
      const isDefining = !!coll && coll.stem !== '' && img.stem.toLowerCase() === coll.stem.toLowerCase()

      // For the defining photo the collection tag is its own first keyword (the
      // source of truth) — treat it like any other photo (no tag to strip).
      // For all others, resolveDisplayMeta strips the projected tag so it never
      // leaks into the XMP, then prepends it back for the desired JPG keywords.
      const effectiveTag = isDefining ? null : tag

      const { authoritative, desiredJpgKeywords, xmpNeedsUpdate } = resolveDisplayMeta(
        jpgMeta,
        xmpMeta,
        effectiveTag,
      )

      // The raw sidecar mirrors the authoritative (collection-free) metadata.
      // crs: edits are untouched by writeMeta.
      if (xmpNeedsUpdate) {
        await writeMeta(exiftool, img.xmpSrc, authoritative)
        img.actions.push('meta→xmp')
      }

      // Project the collection tag onto the JPG, respecting nc/rc opt-out tokens.
      let finalJpgKeywords: string[]
      if (!tag || isDefining) {
        finalJpgKeywords = authoritative.keywords // no collection, or this IS the source
      } else {
        const suppress = coll!.nc || coll!.rc || hasToken(authoritative.extDescr, 'nc') || hasToken(authoritative.extDescr, 'rc')
        const purge = coll!.rc || hasToken(authoritative.extDescr, 'rc')
        const base = purge ? withoutTag(desiredJpgKeywords, tagLc) : desiredJpgKeywords
        finalJpgKeywords = suppress
          ? withoutTag(base, tagLc) // strip any existing copy too if suppressed
          : base
      }
      const desiredJpg: Meta = { ...authoritative, keywords: finalJpgKeywords }
      if (!metaEqualStrict(jpgMeta, desiredJpg)) {
        await writeMeta(exiftool, img.jpgSrc, desiredJpg)
        img.actions.push('meta→jpg')
      }

      // Record the post-write fingerprint so a clean re-run skips this photo.
      newImageCache[img.slug] = imgFingerprint(img.jpgSrc, img.xmpSrc)
    }
  } finally {
    await exiftool.end()
  }

  // ── Phase 3: aggregate to local working dir (gitignored) ────────────────────
  // public/photos is a gitignored LOCAL working folder that `generate` reads to
  // build derivatives + EXIF; binaries no longer live in the repo. The JPG/XMP
  // are copied here so generate can read them; the derivatives land in the
  // gitignored .image-cache. All of these are then uploaded to Storage below.
  let changed = 0
  let unchanged = 0
  let publicChanged = false

  for (const img of images) {
    if (copyIfChanged(img.jpgSrc, img.destJpg)) { img.actions.push('jpg'); publicChanged = true }
    if (img.xmpSrc && copyIfChanged(img.xmpSrc, img.destXmp)) { img.actions.push('xmp'); publicChanged = true }
    if (img.actions.length > 0) {
      console.log(`  sync  ${img.file}  [${img.actions.join(', ')}]`)
      changed++
    } else {
      unchanged++
    }
  }

  // Persist the fingerprint cache. Folder fingerprints are recomputed AFTER the
  // sync writes so our own sidecar edits don't force a recompute next run.
  const newFolderCache: Record<string, FolderCacheEntry> = {}
  for (const [folder, defining] of folderCollections) {
    newFolderCache[folder] = { fingerprint: folderFingerprint(folder), defining }
  }
  const newCache: SyncCache = { folders: newFolderCache, images: newImageCache }
  writeFileSync(CACHE_FILE, JSON.stringify(newCache))

  // photos.overrides.json (the legacy rawUrl source) is owned by the manifest-
  // source reconcile work; the binary sync no longer mutates it. Round-trip it
  // untouched so its retirement stays that agent's concern.
  writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2) + '\n')

  // Generate derivatives (into .image-cache) + the manifest. Run before the
  // upload pass so the thumb/display WebPs exist to upload.
  if (publicChanged || !existsSync(PHOTOS_TS)) {
    console.log('Regenerating photos.ts + collections.ts…')
    execSync('npm run generate', { cwd: PROJECT_ROOT, stdio: 'inherit' })
  } else {
    console.log('No public changes — skipping generate.')
  }

  // ── Phase 4: upload every photo's binaries to public Storage ────────────────
  // Full JPG, thumb, display, ARW, XMP each go to their fixed slug path,
  // overwriting in place. Objects carry a short (1h, non-immutable) cache.
  for (const img of images) {
    const arwSrc = lookupRaw(img.stem, '.arw')
    const uploads: Array<{ kind: StorageKind; path: string }> = [
      { kind: 'full', path: img.destJpg },
      { kind: 'thumb', path: join(CACHE_DIR, 'thumbs', `${img.slug}.webp`) },
      { kind: 'display', path: join(CACHE_DIR, 'display', `${img.slug}.webp`) },
      ...(arwSrc ? [{ kind: 'raw' as StorageKind, path: arwSrc }] : []),
      ...(img.xmpSrc ? [{ kind: 'xmp' as StorageKind, path: img.xmpSrc }] : []),
    ]
    for (const { kind, path } of uploads) {
      if (!existsSync(path)) continue
      await uploadObject(path, img.slug, kind)
    }
    console.log(`  upload  ${img.slug}  [${uploads.filter(u => existsSync(u.path)).map(u => u.kind).join(', ')}]`)
  }

  console.log(`\nDone. ${changed} updated, ${unchanged} unchanged.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
