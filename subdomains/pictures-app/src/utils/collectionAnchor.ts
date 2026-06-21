/**
 * Hash-based deep links into gallery collection sections.
 * A collection URL like `/#collection-nature` scrolls the gallery so that
 * collection's section header sits at the top of the viewport.
 *
 * These helpers are siblings to galleryAnchor.ts (photo-slug hashes).
 * The two systems are kept distinct by the `collection-` prefix so they
 * never collide. Use `isCollectionHash` to guard whichever effect should
 * ignore the other kind.
 */

const PREFIX = 'collection-'

/** The location hash that anchors on a given collection id. */
export function collectionHashForId(id: string): string {
  return `#${PREFIX}${id}`
}

/**
 * The collection id encoded in a `#collection-<id>` hash, or null if the
 * hash is not a collection hash (e.g. it is a photo-slug hash or empty).
 */
export function idFromCollectionHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.startsWith(PREFIX)) return null
  const id = raw.slice(PREFIX.length)
  return id.length > 0 ? id : null
}

/**
 * Returns true iff the hash is a collection-section anchor
 * (i.e. begins with `#collection-` followed by at least one character).
 * Use this predicate to make the photo-slug deep-link effect skip
 * collection hashes without misreading them as slugs.
 */
export function isCollectionHash(hash: string): boolean {
  return idFromCollectionHash(hash) !== null
}
