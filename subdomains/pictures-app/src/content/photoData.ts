import { createContext, useContext } from 'react'
import type { Photo, Collection } from '../types/photos'

/** The runtime photo manifest: the full photo array, curated gallery order,
 *  and the section collections. Shape mirrors the committed `photos.ts` /
 *  `collections.ts` fixtures and the single Firestore manifest document. */
export type PhotoData = {
  photos: Photo[]
  collections: Collection[]
  galleryOrder: string[]
}

export const PhotoDataContext = createContext<PhotoData | null>(null)

export function usePhotoData(): PhotoData {
  const value = useContext(PhotoDataContext)
  if (value === null) {
    throw new Error('usePhotoData must be used within a PhotoDataProvider')
  }
  return value
}
