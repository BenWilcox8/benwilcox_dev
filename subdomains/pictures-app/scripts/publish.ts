/**
 * Pure publish-selection logic for the photo sync.
 *
 * The GREEN color label (set in Lightroom, read off the exported JPG's `Label`
 * tag) is the single publish signal. These helpers are filesystem- and
 * Firebase-free so they can be unit-tested in isolation; the sync feeds them the
 * discovered labels and acts on the resulting sets.
 */

/** The single color label that marks a photo for publication. */
export const PUBLISH_LABEL = 'green'

/** True when a photo's color label marks it published (case-insensitive). */
export function isPublished(label: string | null | undefined): boolean {
  return typeof label === 'string' && label.trim().toLowerCase() === PUBLISH_LABEL
}

/** A discovered exported JPG: its slug and its (color) Label tag. */
export interface DiscoveredPhoto {
  slug: string
  label: string | null | undefined
}

/** The set of slugs to publish: those whose discovered label is green. */
export function selectPublishedSlugs(discovered: DiscoveredPhoto[]): Set<string> {
  const slugs = new Set<string>()
  for (const { slug, label } of discovered) {
    if (isPublished(label)) slugs.add(slug)
  }
  return slugs
}

/** The publish diff against the manifest's current slugs. */
export interface PublishDiff {
  /** Newly-green slugs absent from the manifest — upload + add (issue #39). */
  toAdd: Set<string>
  /** Manifest slugs no longer green — prune (issue #40). */
  toRemove: Set<string>
}

/**
 * Diff the manifest's current slugs against the freshly-discovered green set.
 * Keyed purely on slug, so the add half is idempotent (already-published slugs
 * are never re-added) and the remove half feeds the #40 prune.
 */
export function diffPublishSet(prevSlugs: Set<string>, greenSlugs: Set<string>): PublishDiff {
  const toAdd = new Set<string>()
  const toRemove = new Set<string>()
  for (const slug of greenSlugs) {
    if (!prevSlugs.has(slug)) toAdd.add(slug)
  }
  for (const slug of prevSlugs) {
    if (!greenSlugs.has(slug)) toRemove.add(slug)
  }
  return { toAdd, toRemove }
}
