/**
 * Pure navigation helper for the detail page arrow-key prev/next feature.
 *
 * Given the ordered list of photo slugs (date-sorted, same order the app uses),
 * the current slug, and a direction, returns the adjacent slug — or null at the
 * boundaries (no wrap).
 */

export type NavDirection = 'left' | 'right'

/**
 * Resolve the slug of the photo adjacent to `currentSlug` in `direction`.
 *
 * @param slugs      Ordered array of all photo slugs (same order as filmstrip).
 * @param currentSlug The slug currently displayed.
 * @param direction  'left' = previous, 'right' = next.
 * @returns The adjacent slug, or null if at a boundary or slug not found.
 */
export function resolveAdjacentSlug(
  slugs: readonly string[],
  currentSlug: string,
  direction: NavDirection,
): string | null {
  const idx = slugs.indexOf(currentSlug)
  if (idx === -1) return null

  const nextIdx = direction === 'right' ? idx + 1 : idx - 1
  if (nextIdx < 0 || nextIdx >= slugs.length) return null

  return slugs[nextIdx]
}
