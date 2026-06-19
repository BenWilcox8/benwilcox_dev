export type SizeHint = 'small' | 'medium' | 'large'

export type PhotoExif = {
  aperture: string | null
  shutter: string | null
  iso: number | null
  focalLength: string | null
  camera: string | null
  lens: string | null
}

export type Photo = {
  slug: string
  collections: string[]
  /** Explicit tile size from the Lightroom Extended Description (`size:…`); null falls back to rating */
  explicitSize: SizeHint | null
  /** True width/height ratio of the photo, clamped to a sane range (shape of the bin-pack tile) */
  aspectRatio: number
  /** ~400 px wide WebP derivative, for gallery grid and filmstrip thumbnails */
  thumbSrc: string
  /** ~1600 px wide WebP derivative, for the detail hero */
  displaySrc: string
  /** Full-resolution original JPG/PNG, for zoom + download */
  fullSrc: string
  rawUrl: string | null
  date: string | null
  location: string | null
  title: string | null
  caption: string | null
  rating: number | null
  exif: PhotoExif
  edits: Record<string, number> | null
}

export type Collection = {
  id: string
  name: string
  color: string
}
