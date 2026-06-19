import type { Collection } from '../types/photos'

/**
 * Resolve the color of a photo's first (highest-precedence) collection.
 *
 * "First collection" is the first id in the photo's `collections` array that
 * corresponds to a real collection — consistent with the gallery/filmstrip
 * primary-collection logic. Returns null when the photo has no resolvable
 * collection, so callers can fall back to a neutral sidebar tint.
 */
export function resolveFirstCollectionColor(
  collectionIds: readonly string[],
  collections: readonly Collection[],
): string | null {
  for (const id of collectionIds) {
    const match = collections.find(c => c.id === id)
    if (match) return match.color
  }
  return null
}
