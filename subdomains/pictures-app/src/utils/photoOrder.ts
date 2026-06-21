// Ordering for the generated `photos.ts` array. The detail-page filmstrip and
// prev/next navigation consume this array order directly, so it must read
// newest→oldest by capture date AND time. Undated photos sort last.

/** The most precise capture key available: full `dateTime` when present, else
 *  the date-only `date`. Both are ISO-ordered, so lexical comparison is correct
 *  even when mixing a timed value (`2026-06-19T19:35:00`) with a date-only one
 *  (`2026-06-19`) — the timed value sorts as the later capture that day. */
function captureKey(p: { date: string | null; dateTime?: string | null }): string | null {
  return p.dateTime ?? p.date
}

/** Comparator that orders photos by capture date+time descending (newest first). */
export function byDateDescending(
  a: { date: string | null; dateTime?: string | null },
  b: { date: string | null; dateTime?: string | null },
): number {
  const ka = captureKey(a)
  const kb = captureKey(b)
  if (!ka && !kb) return 0
  if (!ka) return 1
  if (!kb) return -1
  return kb.localeCompare(ka)
}

/** Returns a new array sorted newest-first by capture date+time (undated last). */
export function orderPhotosByDateDescending<T extends { date: string | null; dateTime?: string | null }>(
  photos: readonly T[],
): T[] {
  return [...photos].sort(byDateDescending)
}
