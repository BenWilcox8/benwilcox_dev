import { ExifTool } from 'exiftool-vendored'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, copyFileSync } from 'fs'
import { join, basename, extname, resolve } from 'path'
import sharp from 'sharp'
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import type { Photo, SizeHint } from '../src/types/photos'
import { deriveStorageSrcs, buildStorageUrl } from '../src/utils/storageUrls'
import { computeAspectRatio } from '../src/utils/aspectRatio'
import { orderPhotosByDateDescending } from '../src/utils/photoOrder'
import { type CurrentPhoto } from '../src/utils/orderReconcile'
import { type DiscoveredCollection } from '../src/utils/sectionReconcile'
import { reconcileManifest } from '../src/utils/manifestReconcile'
import { readManifest, writeManifest } from './manifestStore'
import { parseXmpEdits } from './xmp-edits'

const PHOTOS_DIR = join(import.meta.dirname, '../public/photos')
// Derivatives are generated into a GITIGNORED local cache (not committed), then
// uploaded to public Storage by the sync. They are never served from public/.
const CACHE_DIR = join(import.meta.dirname, '../.image-cache')
const THUMBS_DIR = join(CACHE_DIR, 'thumbs')
const DISPLAY_DIR = join(CACHE_DIR, 'display')
const PHOTOS_OUTPUT = join(import.meta.dirname, '../src/content/photos.ts')

// The public bucket the manifest URLs point at. The site loads images straight
// from this bucket's CDN, so the generated manifest must embed the same bucket
// the sync uploads to.
const STORAGE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'benwilcoxdev.firebasestorage.app'
const COLLECTIONS_OUTPUT = join(import.meta.dirname, '../src/content/collections.ts')

const THUMB_WIDTH = 400
const DISPLAY_WIDTH = 1600

/**
 * Generate a WebP derivative of srcPath at destPath with the given max width,
 * skipping if destPath already exists and is newer than srcPath (idempotent).
 * Returns true if a derivative was generated, false if skipped.
 */
async function generateDerivativeIfNeeded(
  srcPath: string,
  destPath: string,
  width: number,
): Promise<boolean> {
  if (existsSync(destPath)) {
    const srcMtime = statSync(srcPath).mtimeMs
    const destMtime = statSync(destPath).mtimeMs
    if (destMtime >= srcMtime) return false // derivative is up-to-date
  }
  await sharp(srcPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destPath)
  return true
}

const UNCATEGORIZED_ID = 'uncategorized'

function deriveSlug(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Turns a Lightroom keyword ("Street Photography") into a collection id ("street-photography").
function slugifyKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function formatAperture(value: number | string | undefined): string | null {
  if (value == null) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  return `f/${num.toFixed(1).replace(/\.0$/, '')}`
}

function formatShutter(value: number | string | undefined): string | null {
  if (value == null) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  if (num >= 1) return `${num}s`
  const denom = Math.round(1 / num)
  return `1/${denom}s`
}

function formatFocalLength(value: number | string | undefined): string | null {
  if (value == null) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  return `${Math.round(num)}mm`
}

// Extracts a size directive from the Lightroom "Extended Description" field.
// That field is free text, so we search for an explicit "size: X" token first,
// then fall back to treating the whole (trimmed) value as an abbreviation.
//   size: large / size: 4 / sl / s4 / large → large
//   size: medium / size: 3 / sm / s3 / medium → medium
//   size: small / size: 2 / size: 1 / ss / s2 / s1 / small → small
//   anything else / blank → null (caller falls back to aspect-ratio auto-detect)
function parseSizeHint(raw: string | null | undefined): SizeHint | null {
  if (!raw) return null
  const text = raw.toLowerCase()

  const tokenMatch = text.match(/size\s*[:=]?\s*(large|medium|small|[1-4])/)
  if (tokenMatch) {
    const v = tokenMatch[1]
    if (v === 'large' || v === '4') return 'large'
    if (v === 'medium' || v === '3') return 'medium'
    if (v === 'small' || v === '2' || v === '1') return 'small'
  }

  // Whole field is just an abbreviation (e.g. "sl").
  const whole = text.trim().replace(/\s+/g, '')
  if (['sl', 'l', 'large', 's4', 'size4'].includes(whole)) return 'large'
  if (['sm', 'm', 'medium', 's3', 'size3'].includes(whole)) return 'medium'
  if (['ss', 's', 'small', 's2', 's1', 'size2', 'size1'].includes(whole)) return 'small'

  // Abbreviation as a space-separated token (e.g. "sl nc"), so size + nc coexist.
  for (const tok of text.split(/\s+/)) {
    if (['sl', 's4', 'size4'].includes(tok)) return 'large'
    if (['sm', 's3', 'size3'].includes(tok)) return 'medium'
    if (['ss', 's2', 's1', 'size2', 'size1'].includes(tok)) return 'small'
  }
  return null
}

// exiftool's typed Tags object doesn't cover every field (e.g. ExtDescrAccessibility),
// so read through an index signature.
type RawTags = Record<string, unknown>

function getString(tags: RawTags, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = tags[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return null
}

function getKeywords(tags: RawTags, ...keys: string[]): string[] {
  const out: string[] = []
  for (const k of keys) {
    const v = tags[k]
    if (Array.isArray(v)) out.push(...v.map(String))
    else if (typeof v === 'string' && v.trim() !== '') out.push(v)
  }
  return out
}

// Deterministic muted-pastel color from a collection id, used when the curator
// hasn't set a color on the manifest's collections.
function autoColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const hue = h % 360
  return hslToHex(hue, 32, 72)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Lazily init the Admin SDK so generate can read/write the Firestore manifest.
// The sync already initializes the app before invoking generate; when run
// standalone we initialize from the same service-account env var.
function ensureFirebase() {
  if (getApps().length) return
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!serviceAccountPath) {
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env')
    process.exit(1)
  }
  const serviceAccount = JSON.parse(
    readFileSync(resolve(serviceAccountPath.replace(/^~/, process.env.HOME ?? '')), 'utf-8'),
  )
  initializeApp({ credential: cert(serviceAccount as ServiceAccount) })
}

// One-time migration: seed the gitignored derivative cache from the WebPs that
// were previously committed under public/{thumbs,display}. Lets the cache start
// warm so the first post-migration run doesn't re-encode every photo. A no-op
// once the public dirs are gone (issue #38 removes them from the repo).
function seedCacheFromPublic(): void {
  const seeds: Array<[string, string]> = [
    [join(import.meta.dirname, '../public/thumbs'), THUMBS_DIR],
    [join(import.meta.dirname, '../public/display'), DISPLAY_DIR],
  ]
  for (const [from, to] of seeds) {
    if (!existsSync(from)) continue
    for (const name of readdirSync(from)) {
      if (!/\.webp$/i.test(name)) continue
      const dest = join(to, name)
      if (!existsSync(dest)) copyFileSync(join(from, name), dest)
    }
  }
}

async function main() {
  // Ensure the gitignored derivative cache exists, then seed it from any
  // still-present committed WebPs.
  mkdirSync(THUMBS_DIR, { recursive: true })
  mkdirSync(DISPLAY_DIR, { recursive: true })
  seedCacheFromPublic()

  ensureFirebase()

  const exiftool = new ExifTool()

  // Previous published manifest is the reconcile's previous-state source: the
  // curated gallery order + section names/colors. ARW URLs are derivable from
  // the fixed slug path, so they're rebuilt per-photo rather than persisted.
  const prevManifest = await readManifest()

  const allFiles = readdirSync(PHOTOS_DIR)
  const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  let derivativesGenerated = 0
  let derivativesSkipped = 0

  const photos: Photo[] = []
  // Maps a collection id to a display name (first keyword spelling wins).
  const collectionNames = new Map<string, string>()

  for (const file of imageFiles) {
    const filePath = join(PHOTOS_DIR, file)
    const slug = deriveSlug(file)

    // Generate WebP derivatives into the gitignored cache (idempotent — skipped
    // when derivative is newer than source). The sync uploads them to Storage.
    const thumbPath = join(THUMBS_DIR, `${slug}.webp`)
    const displayPath = join(DISPLAY_DIR, `${slug}.webp`)
    const thumbGenerated = await generateDerivativeIfNeeded(filePath, thumbPath, THUMB_WIDTH)
    const displayGenerated = await generateDerivativeIfNeeded(filePath, displayPath, DISPLAY_WIDTH)
    if (thumbGenerated || displayGenerated) {
      derivativesGenerated++
      process.stdout.write(`  derivatives  ${file}\n`)
    } else {
      derivativesSkipped++
    }

    // Manifest URLs point straight at the public Storage CDN, not at public/.
    const srcs = deriveStorageSrcs(STORAGE_BUCKET, slug)

    const tags = (await exiftool.read(filePath)) as unknown as RawTags

    const width = (tags.ImageWidth as number | undefined) ?? 0
    const height = (tags.ImageHeight as number | undefined) ?? 0

    const aperture = formatAperture((tags.Aperture ?? tags.FNumber) as number | undefined)
    const shutter = formatShutter((tags.ShutterSpeed ?? tags.ExposureTime) as number | undefined)
    const iso = (tags.ISO as number | undefined) ?? null
    const focalLength = formatFocalLength(tags.FocalLength as string | number | undefined)
    const make = (tags.Make as string | undefined) ?? ''
    const model = (tags.Model as string | undefined) ?? ''
    const camera = make || model ? `${make} ${model}`.trim() : null
    const lens = (tags.LensModel ?? tags.LensInfo) as string | undefined ?? null

    const rawDate = tags.DateTimeOriginal ?? tags.CreateDate
    let date: string | null = null
    if (rawDate) {
      const d = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
      if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10)
    }

    // Raw XMP sidecar (copied alongside the JPG) holds the crs: editing history.
    const xmpName = allFiles.find(f =>
      f.toLowerCase() === basename(file, extname(file)).toLowerCase() + '.xmp'
    )
    const xmpPath = xmpName ? join(PHOTOS_DIR, xmpName) : null
    const xmpContent = xmpPath && existsSync(xmpPath) ? readFileSync(xmpPath, 'utf-8') : null

    const edits = xmpContent !== null ? parseXmpEdits(xmpContent) : null

    // Metadata lives embedded in the exported JPG — the JPG is the single source
    // of truth for all display fields. The raw XMP is NOT a fallback; clearing a
    // field on the JPG must render it blank on the website (issue #10).
    const title = getString(tags, 'Title', 'ObjectName')
    const caption = getString(tags, 'Description', 'Caption-Abstract', 'ImageDescription')
    const ratingStr = getString(tags, 'Rating')
    const rating = ratingStr !== null ? parseInt(ratingStr, 10) : null

    // Explicit size override from the "Extended Description" (Accessibility)
    // field (JPG only). When absent, size is derived from the star rating at
    // display time (see resolveSizeHint) — not baked in here.
    const extDescr = getString(tags, 'ExtDescrAccessibility')
    const explicitSize: SizeHint | null = parseSizeHint(extDescr)

    // Keywords → collections. JPG keywords are authoritative (no XMP union).
    const keywords = getKeywords(tags, 'Subject', 'Keywords')
    const collectionIds: string[] = []
    for (const kw of keywords) {
      const id = slugifyKeyword(kw)
      if (!id) continue
      if (!collectionIds.includes(id)) collectionIds.push(id)
      if (!collectionNames.has(id)) collectionNames.set(id, kw)
    }
    if (collectionIds.length === 0) collectionIds.push(UNCATEGORIZED_ID)

    const base: Photo = {
      slug,
      collections: collectionIds,
      explicitSize,
      aspectRatio: computeAspectRatio(width, height),
      thumbSrc: srcs.thumbSrc,
      displaySrc: srcs.displaySrc,
      fullSrc: srcs.fullSrc,
      // ARW lives at a fixed slug path in the same public bucket; the clean URL
      // is derivable, so the manifest references it directly.
      rawUrl: buildStorageUrl(STORAGE_BUCKET, slug, 'raw'),
      date,
      location: null,
      title,
      caption,
      rating: rating !== null && !isNaN(rating) ? rating : null,
      exif: { aperture, shutter, iso, focalLength, camera, lens: lens as string | null },
      edits,
    }

    photos.push(base)
  }

  // Detail-page filmstrip + prev/next nav read this array order directly, so
  // emit newest→oldest by capture date (undated last). See issue #24.
  const orderedPhotos = orderPhotosByDateDescending(photos)

  // ── Reconcile order + sections against the Firestore manifest ──────────────
  // The reconcile's previous state (curated gallery order + section
  // names/colors) lives on the published Firestore manifest — NOT a local
  // photos.order.json — so console edits survive every sync. The gallery order
  // is a DISTINCT concern from photos.ts: it drives how the gallery lays photos
  // out, while photos.ts stays date-descending for the detail filmstrip.
  // Reconcile preserves the curator's manual order/curation, date-anchors new
  // photos, drops removed/unknown entries, and self-heals.
  const currentForOrder: CurrentPhoto[] = orderedPhotos.map(p => ({
    slug: p.slug,
    date: p.date,
    collectionIds: p.collections,
  }))

  const usedIds = new Set<string>()
  const photoCount = new Map<string, number>()
  const newestDate = new Map<string, string | null>()
  for (const p of orderedPhotos) {
    for (const id of p.collections) {
      usedIds.add(id)
      photoCount.set(id, (photoCount.get(id) ?? 0) + 1)
      const prevNewest = newestDate.get(id) ?? null
      if (p.date && (!prevNewest || p.date > prevNewest)) newestDate.set(id, p.date)
      else if (!newestDate.has(id)) newestDate.set(id, prevNewest)
    }
  }
  if (usedIds.has(UNCATEGORIZED_ID)) collectionNames.set(UNCATEGORIZED_ID, 'uncategorized')

  const discovered: DiscoveredCollection[] = [...usedIds].map(id => ({
    id,
    name: collectionNames.get(id) ?? id,
    color: autoColor(id),
    newestDate: newestDate.get(id) ?? null,
    photoCount: photoCount.get(id) ?? 0,
  }))

  const {
    galleryOrder: nextGalleryOrder,
    collections,
    warnings: reconcileWarnings,
  } = reconcileManifest(prevManifest, currentForOrder, discovered)
  for (const w of reconcileWarnings) console.warn(w)

  // ── Write photos.ts ────────────────────────────────────────────────────────
  const photoLines: string[] = []
  photoLines.push('// AUTO-GENERATED by scripts/generate-photos.ts — do not edit by hand')
  photoLines.push("import type { Photo } from '../types/photos'")
  photoLines.push('')
  photoLines.push('export const photos: Photo[] = [')
  for (const photo of orderedPhotos) {
    photoLines.push('  ' + JSON.stringify(photo, null, 2).replace(/\n/g, '\n  ') + ',')
  }
  photoLines.push(']')
  photoLines.push('')
  // Curator's global gallery order (reconciled from the Firestore manifest).
  // The gallery lays each section out in this relative order; photos.ts above
  // stays date-descending.
  photoLines.push('export const galleryOrder: string[] = ' + JSON.stringify(nextGalleryOrder))
  photoLines.push('')
  writeFileSync(PHOTOS_OUTPUT, photoLines.join('\n'))

  // ── Write collections.ts ─────────────────────────────────────────────────────
  const colLines: string[] = []
  colLines.push('// AUTO-GENERATED by scripts/generate-photos.ts — curate section')
  colLines.push('// order/names/colors in the Firestore manifest console, not here.')
  colLines.push("import type { Collection } from '../types/photos'")
  colLines.push('')
  colLines.push('export const collections: Collection[] = [')
  for (const c of collections) {
    colLines.push('  ' + JSON.stringify(c) + ',')
  }
  colLines.push(']')
  colLines.push('')
  writeFileSync(COLLECTIONS_OUTPUT, colLines.join('\n'))

  // ── Publish the reconciled manifest to Firestore ───────────────────────────
  // This single doc is the website's runtime source (issue #37) AND the
  // reconcile's previous-state source on the next run (issue #41): the curator
  // edits order + section names/colors directly in the console and those edits
  // survive here.
  await writeManifest({
    photos: orderedPhotos,
    collections,
    galleryOrder: nextGalleryOrder,
  })

  console.log(`Generated ${orderedPhotos.length} photos, ${collections.length} collections`)
  console.log(`Derivatives: ${derivativesGenerated} generated, ${derivativesSkipped} skipped (up-to-date)`)

  await exiftool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
