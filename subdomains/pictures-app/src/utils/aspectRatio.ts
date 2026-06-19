import type { SizeHint } from '../types/photos'

// Legacy sizeHint-derived "fake" ratios — superseded by real per-photo ratios.
// Kept only so dev mode can A/B the old cropping behavior against the new one.
export const ASPECT_RATIO: Record<SizeHint, number> = {
  large: 1.78,
  medium: 1.5,
  small: 0.67,
}

// Sane bounds for a tile's shape. Real photos can be more extreme (panoramas,
// tall crops), but the mosaic packs better and reads more evenly if a single
// frame can't span the whole row or collapse to a sliver.
export const MIN_ASPECT_RATIO = 0.5
export const MAX_ASPECT_RATIO = 2.0

/**
 * True aspect ratio (width / height) for a photo, clamped to a sane range.
 * Falls back to 1 (square) when either dimension is missing/zero.
 */
export function computeAspectRatio(width: number, height: number): number {
  if (!width || !height) return 1
  const ratio = width / height
  return Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, ratio))
}
