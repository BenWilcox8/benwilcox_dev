import type { PhotoData } from '../content/photoData'
import { photos, galleryOrder } from '../content/photos'
import { collections } from '../content/collections'

/**
 * The canonical manifest fixture: the locally-generated `photos.ts` /
 * `collections.ts` content, now used purely as test data. Component tests wrap
 * the unit under test in a provider seeded with this so they render offline
 * against the same shape the live Firestore manifest carries.
 */
export const fixturePhotoData: PhotoData = {
  photos,
  collections,
  galleryOrder,
}
