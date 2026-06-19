import type { Photo } from '../types/photos'

// Display fields for a gallery tile's always-on hover info card. Pure so the
// exact field set/formatting is the unit-test seam (the card component just
// renders these strings).

export type TileInfo = {
  filename: string
  aspectRatio: string
  aperture: string
  shutter: string
  iso: string
  rating: string
}

const DASH = '—'

export function formatTileInfo(photo: Photo): TileInfo {
  return {
    filename: photo.slug,
    aspectRatio: photo.aspectRatio.toFixed(2),
    aperture: photo.exif.aperture ?? DASH,
    shutter: photo.exif.shutter ?? DASH,
    iso: photo.exif.iso != null ? String(photo.exif.iso) : DASH,
    rating: `${photo.rating ?? 0}★`,
  }
}
