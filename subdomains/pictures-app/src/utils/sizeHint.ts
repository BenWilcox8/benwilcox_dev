import type { SizeHint } from '../types/photos'

/**
 * Resolve a photo's effective tile size. An explicit size from the Lightroom
 * "Extended Description" (e.g. `size:large`) always wins. Otherwise the star
 * rating drives it: 0-1★ → small, 2-3★ → medium, 4-5★ → large. An unrated
 * photo (null rating) is treated as small.
 */
export function resolveSizeHint(
  explicitSize: SizeHint | null,
  rating: number | null,
): SizeHint {
  if (explicitSize) return explicitSize
  const stars = rating ?? 0
  if (stars >= 4) return 'large'
  if (stars >= 2) return 'medium'
  return 'small'
}
