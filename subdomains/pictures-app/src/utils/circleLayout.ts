/**
 * Compute the vertical pixel offset of each collection circle on the
 * navigation rail.
 *
 * Algorithm:
 * 1. Compute a *base* offset for each collection at the **start** of its photo
 *    span — the leading edge of the stretch of page that collection occupies:
 *      base[i] = photosBefore[i] / totalPhotos * railHeight
 *    so each circle sits at the relative beginning of its section (the first
 *    circle at the very top) and the colored line below it runs down to the next
 *    section's circle.
 *
 * 2. Walk the offsets in order and push each one down so it is at least
 *    `minGap` below the previous one.
 *
 * 3. Fallback to **even spacing** (i / (n - 1) * railHeight, first at 0, last at
 *    railHeight) when proportional layout can't work or won't fit:
 *    - totalPhotos === 0 (no proportional math possible), or
 *    - (n - 1) * minGap > railHeight (the gaps can't all fit at all), or
 *    - the min-gap cascade pushed the last marker past the rail bottom.
 *
 * @param collections  Ordered list of { id, photoCount }.  Order matches the
 *                     on-page section order; output order matches input.
 * @param railHeight   Pixel height of the rail (the full range available).
 * @param minGap       Minimum pixel gap between adjacent circle centres.
 * @returns            Array of { id, offset } in the same order as the input.
 */
export type CircleLayoutInput = { id: string; photoCount: number }
export type CircleOffset = { id: string; offset: number }

export function computeCircleOffsets(
  collections: CircleLayoutInput[],
  railHeight: number,
  minGap: number,
): CircleOffset[] {
  const n = collections.length

  // Empty input
  if (n === 0) return []

  // Single collection is trivially at offset 0
  if (n === 1) return [{ id: collections[0].id, offset: 0 }]

  const evenSpacing = (): CircleOffset[] =>
    collections.map((c, i) => ({
      id: c.id,
      offset: (i / (n - 1)) * railHeight,
    }))

  // Fall back when the min gaps can't all fit, or when there are no photos at
  // all (can't do proportional math).
  const totalPhotos = collections.reduce((sum, c) => sum + c.photoCount, 0)
  if ((n - 1) * minGap > railHeight || totalPhotos === 0) {
    return evenSpacing()
  }

  // Compute proportional base offsets at the start of each collection's span.
  let cumulative = 0
  const baseOffsets: number[] = []
  for (const c of collections) {
    baseOffsets.push((cumulative / totalPhotos) * railHeight)
    cumulative += c.photoCount
  }

  // Enforce minimum gap by walking forward and pushing down as needed.
  const offsets = [...baseOffsets]
  for (let i = 1; i < n; i++) {
    const minAllowed = offsets[i - 1] + minGap
    if (offsets[i] < minAllowed) {
      offsets[i] = minAllowed
    }
  }

  // The min-gap cascade can push the last marker past the rail bottom; even
  // spacing reads cleaner than a marker off the end.
  if (offsets[n - 1] > railHeight) return evenSpacing()

  return collections.map((c, i) => ({ id: c.id, offset: offsets[i] }))
}
