/**
 * Hash-based deep links into the gallery. A gallery URL like `/#dsc03829`
 * scrolls the gallery so that photo sits at the top; the detail page's
 * "back to gallery" control links to the currently-viewed photo's anchor so
 * the user lands back on the photo they came from.
 */

/** The photo slug encoded in a location hash (e.g. `#dsc03829`), or null. */
export function slugFromHash(hash: string): string | null {
  const slug = hash.replace(/^#/, '').trim()
  return slug ? decodeURIComponent(slug) : null
}

/** The gallery href that anchors on a given photo slug. */
export function galleryHrefForSlug(slug: string): string {
  return `/#${slug}`
}
