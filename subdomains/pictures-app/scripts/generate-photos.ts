import { ExifTool } from 'exiftool-vendored'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, basename, extname } from 'path'
import type { Photo, SizeHint } from '../src/types/photos'

const PHOTOS_DIR = join(import.meta.dirname, '../public/photos')
const OUTPUT_FILE = join(import.meta.dirname, '../src/content/photos.ts')
const OVERRIDES_FILE = join(import.meta.dirname, '../photos.overrides.json')

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

function deriveSlug(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
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

// Parses the photoshop:Instructions attribute value into a SizeHint.
// In Lightroom, set this in the IPTC panel → Instructions field.
// Accepted values: sl/l/s4/size:4/size:large → large
//                  sm/m/s3/size:3/size:medium → medium
//                  ss/s2/size:2/size:small → small
//                  s1/size:1 → small
//                  blank → null (falls back to aspect-ratio auto-detect)
export function parseSizeHint(raw: string): SizeHint | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  if (['sl', 'l', 'large', 's4', 'size4', 'size:4', 'sizelarge', 'size:large'].includes(s)) return 'large'
  if (['sm', 'm', 'medium', 's3', 'size3', 'size:3', 'sizemedium', 'size:medium'].includes(s)) return 'medium'
  if (['ss', 's', 'small', 's2', 'size2', 'size:2', 'sizesmall', 'size:small', 's1', 'size1', 'size:1'].includes(s)) return 'small'
  return null
}

// Returns the canonical expanded form written back to the XMP sidecar.
export function toCanonicalSizeLabel(hint: SizeHint): string {
  return `size: ${hint}`
}

// Expands an abbreviation in the Instructions field of an XMP file's content string.
// If the attribute exists, replaces its value. If not, injects it after photoshop:DateCreated.
export function expandInstructionsInXmp(content: string, canonical: string): string {
  if (/photoshop:Instructions="[^"]*"/.test(content)) {
    return content.replace(/photoshop:Instructions="[^"]*"/, `photoshop:Instructions="${canonical}"`)
  }
  // Inject after photoshop:DateCreated if present, otherwise after SidecarForExtension
  const anchor = /photoshop:DateCreated="[^"]*"/.test(content)
    ? /(photoshop:DateCreated="[^"]*")/
    : /(photoshop:SidecarForExtension="[^"]*")/
  return content.replace(anchor, `$1\n   photoshop:Instructions="${canonical}"`)
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

function parseXmpInstructions(xmpContent: string): string {
  // Attribute form (most common in Lightroom): photoshop:Instructions="value"
  const attrMatch = xmpContent.match(/photoshop:Instructions="([^"]*)"/)
  if (attrMatch) return attrMatch[1]
  // Element form (written by sync script): <photoshop:Instructions>value</photoshop:Instructions>
  const elemMatch = xmpContent.match(/<photoshop:Instructions>([^<]*)<\/photoshop:Instructions>/)
  return elemMatch ? elemMatch[1].trim() : ''
}

async function main() {
  const exiftool = new ExifTool()

  const overrides: Record<string, Partial<Photo>> = existsSync(OVERRIDES_FILE)
    ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf-8'))
    : {}

  const allFiles = readdirSync(PHOTOS_DIR)
  const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  const photos: Photo[] = []

  for (const file of imageFiles) {
    const filePath = join(PHOTOS_DIR, file)
    const slug = deriveSlug(file)

    const tags = await exiftool.read(filePath)

    const width = (tags.ImageWidth as number | undefined) ?? 0
    const height = (tags.ImageHeight as number | undefined) ?? 0

    const aperture = formatAperture((tags.Aperture ?? tags.FNumber) as number | undefined)
    const shutter = formatShutter((tags.ShutterSpeed ?? tags.ExposureTime) as number | undefined)
    const iso = (tags.ISO as number | undefined) ?? null
    const focalLength = formatFocalLength((tags.FocalLength as string | number | undefined))
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

    const xmpName = allFiles.find(f =>
      f.toLowerCase() === basename(file, extname(file)).toLowerCase() + '.xmp'
    )
    const xmpPath = xmpName ? join(PHOTOS_DIR, xmpName) : null
    const xmpContent = xmpPath && existsSync(xmpPath) ? readFileSync(xmpPath, 'utf-8') : null

    const edits = xmpContent !== null ? parseXmpEdits(xmpContent) : null

    // Read title, caption, rating from XMP sidecar via exiftool
    let title: string | null = null
    let caption: string | null = null
    let rating: number | null = null
    if (xmpPath && existsSync(xmpPath)) {
      const xmpTags = await exiftool.read(xmpPath)
      title = (xmpTags.Title as string | undefined) ?? null
      caption = (xmpTags.Description as string | undefined) ?? null
      rating = (xmpTags.Rating as number | undefined) ?? null
    }

    // Size hint: from Instructions field in XMP, falling back to aspect ratio
    let sizeHint: SizeHint
    if (xmpContent !== null) {
      const instructions = parseXmpInstructions(xmpContent)
      sizeHint = parseSizeHint(instructions) ?? (width > height ? 'medium' : 'small')
    } else {
      sizeHint = width > height ? 'medium' : 'small'
    }

    const base: Photo = {
      slug,
      collections: ['street'],
      sizeHint,
      displaySrc: `/photos/${file}`,
      rawUrl: null,
      date,
      location: null,
      title,
      caption,
      rating,
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

  const lines: string[] = []
  lines.push('// AUTO-GENERATED by scripts/generate-photos.ts — do not edit by hand')
  lines.push("import type { Photo } from '../types/photos'")
  lines.push('')
  lines.push('export const photos: Photo[] = [')
  for (const photo of photos) {
    lines.push('  ' + JSON.stringify(photo, null, 2).replace(/\n/g, '\n  ') + ',')
  }
  lines.push(']')
  lines.push('')

  writeFileSync(OUTPUT_FILE, lines.join('\n'))
  console.log(`Generated ${photos.length} photos → src/content/photos.ts`)

  await exiftool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
