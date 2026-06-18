import { ExifTool } from 'exiftool-vendored'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, basename, extname } from 'path'
import type { Photo, SizeHint, Collection } from '../src/types/photos'

const PHOTOS_DIR = join(import.meta.dirname, '../public/photos')
const PHOTOS_OUTPUT = join(import.meta.dirname, '../src/content/photos.ts')
const COLLECTIONS_OUTPUT = join(import.meta.dirname, '../src/content/collections.ts')
const OVERRIDES_FILE = join(import.meta.dirname, '../photos.overrides.json')
const COLLECTIONS_OVERRIDES_FILE = join(import.meta.dirname, '../collections.overrides.json')

const UNCATEGORIZED_ID = 'uncategorized'

const XMP_EDIT_KEYS = [
  'Exposure2012',
  'Contrast2012',
  'Highlights2012',
  'Shadows2012',
  'Whites2012',
  'Blacks2012',
  'Clarity2012',
  'Vibrance',
  'Saturation',
  'Sharpness',
  'LuminanceSmoothing',
  'ColorNoiseReduction',
]

// Per-collection curation: { "<id>": { name?, color?, order? } }
type CollectionOverride = { name?: string; color?: string; order?: number }

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

function parseXmpEdits(xmpContent: string): Record<string, number> {
  const edits: Record<string, number> = {}
  for (const key of XMP_EDIT_KEYS) {
    const match = xmpContent.match(new RegExp(`crs:${key}="([^"]+)"`))
    if (match) {
      const val = parseFloat(match[1])
      if (!isNaN(val) && val !== 0) edits[key] = val
    }
  }
  return edits
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

// Deterministic muted-pastel color from a collection id, used when the user
// hasn't curated a color in collections.overrides.json.
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

async function main() {
  const exiftool = new ExifTool()

  const overrides: Record<string, Partial<Photo>> = existsSync(OVERRIDES_FILE)
    ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf-8'))
    : {}

  const collectionOverrides: Record<string, CollectionOverride> = existsSync(COLLECTIONS_OVERRIDES_FILE)
    ? JSON.parse(readFileSync(COLLECTIONS_OVERRIDES_FILE, 'utf-8'))
    : {}

  const allFiles = readdirSync(PHOTOS_DIR)
  const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  const photos: Photo[] = []
  // Maps a collection id to a display name (first keyword spelling wins).
  const collectionNames = new Map<string, string>()

  for (const file of imageFiles) {
    const filePath = join(PHOTOS_DIR, file)
    const slug = deriveSlug(file)

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
    const xmpTags = xmpPath && existsSync(xmpPath)
      ? ((await exiftool.read(xmpPath)) as unknown as RawTags)
      : null

    const edits = xmpContent !== null ? parseXmpEdits(xmpContent) : null

    // Metadata lives embedded in the exported JPG; raw XMP is the fallback.
    const title = getString(tags, 'Title', 'ObjectName') ?? (xmpTags ? getString(xmpTags, 'Title') : null)
    const caption = getString(tags, 'Description', 'Caption-Abstract', 'ImageDescription')
      ?? (xmpTags ? getString(xmpTags, 'Description') : null)
    const ratingStr = getString(tags, 'Rating') ?? (xmpTags ? getString(xmpTags, 'Rating') : null)
    const rating = ratingStr !== null ? parseInt(ratingStr, 10) : null

    // Size hint from the "Extended Description" (Accessibility) field.
    const extDescr = getString(tags, 'ExtDescrAccessibility')
      ?? (xmpTags ? getString(xmpTags, 'ExtDescrAccessibility') : null)
    const sizeHint: SizeHint = parseSizeHint(extDescr) ?? (width > height ? 'medium' : 'small')

    // Keywords → collections. Union of JPG keywords and raw-XMP keywords.
    const keywords = [
      ...getKeywords(tags, 'Subject', 'Keywords'),
      ...(xmpTags ? getKeywords(xmpTags, 'Subject', 'Keywords') : []),
    ]
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
      sizeHint,
      displaySrc: `/photos/${file}`,
      rawUrl: null,
      date,
      location: null,
      title,
      caption,
      rating: rating !== null && !isNaN(rating) ? rating : null,
      exif: { aperture, shutter, iso, focalLength, camera, lens: lens as string | null },
      edits,
    }

    const override = overrides[slug] ?? {}
    photos.push({ ...base, ...override })
  }

  photos.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  // ── Build collections list from every id referenced by a photo ────────────
  const usedIds = new Set<string>()
  for (const p of photos) for (const id of p.collections) usedIds.add(id)
  if (usedIds.has(UNCATEGORIZED_ID)) collectionNames.set(UNCATEGORIZED_ID, 'uncategorized')

  const collections: Collection[] = [...usedIds].map(id => {
    const ov = collectionOverrides[id] ?? {}
    return {
      id,
      name: ov.name ?? collectionNames.get(id) ?? id,
      color: ov.color ?? autoColor(id),
    }
  })
  collections.sort((a, b) => {
    const oa = collectionOverrides[a.id]?.order ?? Number.MAX_SAFE_INTEGER
    const ob = collectionOverrides[b.id]?.order ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    // uncategorized always sinks to the bottom among un-ordered collections
    if (a.id === UNCATEGORIZED_ID) return 1
    if (b.id === UNCATEGORIZED_ID) return -1
    return a.name.localeCompare(b.name)
  })

  // ── Write photos.ts ────────────────────────────────────────────────────────
  const photoLines: string[] = []
  photoLines.push('// AUTO-GENERATED by scripts/generate-photos.ts — do not edit by hand')
  photoLines.push("import type { Photo } from '../types/photos'")
  photoLines.push('')
  photoLines.push('export const photos: Photo[] = [')
  for (const photo of photos) {
    photoLines.push('  ' + JSON.stringify(photo, null, 2).replace(/\n/g, '\n  ') + ',')
  }
  photoLines.push(']')
  photoLines.push('')
  writeFileSync(PHOTOS_OUTPUT, photoLines.join('\n'))

  // ── Write collections.ts ─────────────────────────────────────────────────────
  const colLines: string[] = []
  colLines.push('// AUTO-GENERATED by scripts/generate-photos.ts — curate names/colors/order')
  colLines.push('// in collections.overrides.json, not here.')
  colLines.push("import type { Collection } from '../types/photos'")
  colLines.push('')
  colLines.push('export const collections: Collection[] = [')
  for (const c of collections) {
    colLines.push('  ' + JSON.stringify(c) + ',')
  }
  colLines.push(']')
  colLines.push('')
  writeFileSync(COLLECTIONS_OUTPUT, colLines.join('\n'))

  console.log(`Generated ${photos.length} photos, ${collections.length} collections`)

  await exiftool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
