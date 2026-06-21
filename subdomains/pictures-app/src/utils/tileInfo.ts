import type { Photo } from '../types/photos'
import { formatCaptureDateTime } from './captureDateTime'

// Display fields for a gallery tile's always-on hover info card. Pure so the
// exact field set/formatting is the unit-test seam (the card component just
// renders these strings).

export type TileInfo = {
  /** The photo's title when set, else its filename (slug) as a fallback. */
  label: string
  /** Capture date + time, e.g. `june 19, 2026 · 7:35 pm` (date only when there
   *  is no time, a dash when there is no capture date at all). */
  captured: string
  aperture: string
  shutter: string
  iso: string
  rating: string
}

const DASH = '—'

export function formatTileInfo(photo: Photo): TileInfo {
  const display = formatCaptureDateTime(photo.dateTime ?? photo.date)
  const captured = display
    ? display.time
      ? `${display.date} · ${display.time}`
      : display.date
    : DASH

  return {
    label: photo.title ?? photo.slug,
    captured,
    aperture: photo.exif.aperture ?? DASH,
    shutter: photo.exif.shutter ?? DASH,
    iso: photo.exif.iso != null ? String(photo.exif.iso) : DASH,
    rating: `${photo.rating ?? 0}★`,
  }
}
