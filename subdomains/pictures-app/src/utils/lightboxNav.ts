/**
 * Pure slide-index <-> slug mapping for the full-res lightbox carousel.
 *
 * The lightbox is fed every photo as a slide in the app's chronological order
 * (the `photos` array order, newest -> oldest). These helpers translate between
 * a slide index and the corresponding photo slug so the app route can stay in
 * sync with the currently displayed slide. Navigation is finite (no wrap):
 * indices are clamped to the valid range.
 */

/** The slide index for a given slug, or 0 if the slug is not found. */
export function slideIndexForSlug(slugs: readonly string[], slug: string): number {
  const idx = slugs.indexOf(slug)
  return idx === -1 ? 0 : idx
}

/** The slug at a given slide index, clamped to the valid range; null if empty. */
export function slugForSlideIndex(slugs: readonly string[], index: number): string | null {
  if (slugs.length === 0) return null
  const clamped = Math.max(0, Math.min(index, slugs.length - 1))
  return slugs[clamped]
}
