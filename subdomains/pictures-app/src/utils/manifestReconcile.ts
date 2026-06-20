// The "previous state" seam for the photo pipeline. Issue #41 moves the source
// of the reconcile's previous order + section curation from the local
// `photos.order.json` file onto the published Firestore manifest. This pure
// function reads the previous `galleryOrder` and `collections` out of a
// manifest-shaped object, runs the UNCHANGED `reconcilePhotoOrder` /
// `reconcileSections`, and returns the next order + collections ready to be
// written straight back into the manifest. Keeping it pure lets the
// read-previous → reconcile → write-back seam be unit-tested with the Admin SDK
// read/write mocked, independent of any Firestore connection.

import { reconcilePhotoOrder, type CurrentPhoto } from './orderReconcile'
import {
  reconcileSections,
  type DiscoveredCollection,
  type Section,
} from './sectionReconcile'
import type { Collection } from '../types/photos'

/** The slice of the manifest the reconcile cares about. A `Collection` is
 *  structurally a `Section` ({ id, name, color }), so the manifest's curated
 *  `collections` array doubles as the previous `sections`. */
export type PrevManifest = {
  galleryOrder?: unknown
  collections?: unknown
}

export type ReconciledManifest = {
  galleryOrder: string[]
  collections: Collection[]
  warnings: string[]
}

export function reconcileManifest(
  prev: PrevManifest | null | undefined,
  current: readonly CurrentPhoto[],
  discovered: readonly DiscoveredCollection[],
): ReconciledManifest {
  const warnings: string[] = []

  // Previous photo order lives under `galleryOrder` on the manifest; the order
  // reconciler reads it from a `photoOrder` field, so adapt the key.
  const { next: nextOrder, warnings: orderWarnings } = reconcilePhotoOrder(
    { photoOrder: prev?.galleryOrder },
    current,
  )
  warnings.push(...orderWarnings)

  // Previous section curation lives under `collections` on the manifest; the
  // section reconciler reads it from a `sections` field, so adapt the key.
  const { next: nextSections, warnings: sectionWarnings } = reconcileSections(
    { sections: prev?.collections },
    discovered,
  )
  warnings.push(...sectionWarnings)

  const collections: Collection[] = nextSections.sections.map((s: Section) => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }))

  return { galleryOrder: nextOrder.photoOrder, collections, warnings }
}
