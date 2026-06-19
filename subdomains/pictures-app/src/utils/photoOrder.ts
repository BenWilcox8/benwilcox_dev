// Ordering for the generated `photos.ts` array. The detail-page filmstrip and
// prev/next navigation consume this array order directly, so it must read
// newest→oldest by capture date. Undated photos sort last.

/** Comparator that orders photos by capture date descending (newest first). */
export function byDateDescending(
  a: { date: string | null },
  b: { date: string | null },
): number {
  if (!a.date && !b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return b.date.localeCompare(a.date)
}

/** Returns a new array sorted newest-first by capture date (undated last). */
export function orderPhotosByDateDescending<T extends { date: string | null }>(
  photos: readonly T[],
): T[] {
  return [...photos].sort(byDateDescending)
}
