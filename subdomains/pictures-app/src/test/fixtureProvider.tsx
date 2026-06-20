import type { ReactNode } from 'react'
import { PhotoDataProvider } from '../content/PhotoDataProvider'
import { fixturePhotoData } from './fixturePhotoData'

/** Wrap children in a PhotoDataProvider seeded with the committed fixture. */
export function WithPhotoData({ children }: { children: ReactNode }) {
  return <PhotoDataProvider value={fixturePhotoData}>{children}</PhotoDataProvider>
}
