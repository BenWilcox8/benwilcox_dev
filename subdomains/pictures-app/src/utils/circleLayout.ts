/**
 * Compute the vertical pixel offset of each collection circle on the
 * navigation rail.
 *
 * Algorithm:
 * 1. Compute a *base* offset for each collection:
 *      base[i] = (sum of photoCount for collections 0..i-1) / totalPhotos * railHeight
 *    When totalPhotos === 0 (or there is only one collection) the base offsets
 *    would all be 0 or undefined — those cases fall through to even spacing.
 *
 * 2. Walk the offsets in order and push each one down so it is at least
 *    `minGap` below the previous one.
 *
 * 3. Fallback: if (n - 1) * minGap > railHeight the minimum gaps cannot all
 *    fit regardless of layout.  In that case (and when totalPhotos === 0 for
 *    n > 1), fall back to **even spacing**: the i-th circle sits at
 *    i / (n - 1) * railHeight (first at 0, last at railHeight).
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

  // Check fallback condition: (n-1)*minGap > railHeight
  const needsFallback = (n - 1) * minGap > railHeight

  // Also fall back when there are no photos at all (can't do proportional math)
  const totalPhotos = collections.reduce((sum, c) => sum + c.photoCount, 0)
  const useEvenSpacing = needsFallback || totalPhotos === 0

  if (useEvenSpacing) {
    return collections.map((c, i) => ({
      id: c.id,
      offset: (i / (n - 1)) * railHeight,
    }))
  }

  // Compute proportional base offsets
  let cumulative = 0
  const baseOffsets: number[] = []
  for (const c of collections) {
    baseOffsets.push((cumulative / totalPhotos) * railHeight)
    cumulative += c.photoCount
  }

  // Enforce minimum gap by walking forward and pushing down as needed
  const offsets = [...baseOffsets]
  for (let i = 1; i < n; i++) {
    const minAllowed = offsets[i - 1] + minGap
    if (offsets[i] < minAllowed) {
      offsets[i] = minAllowed
    }
  }

  return collections.map((c, i) => ({ id: c.id, offset: offsets[i] }))
}
