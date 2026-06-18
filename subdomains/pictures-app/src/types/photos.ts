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
  sizeHint: SizeHint
  displaySrc: string
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
