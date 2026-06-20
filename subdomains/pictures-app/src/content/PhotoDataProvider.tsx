import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, MANIFEST_COLLECTION, MANIFEST_DOC_ID } from '../firebase'
import { PhotoDataContext } from './photoData'
import type { PhotoData } from './photoData'

type Props = {
  children: ReactNode
  /** Seed the provider with manifest data directly, bypassing the network
   *  fetch. Used by tests to render components offline against the fixture. */
  value?: PhotoData
}

export function PhotoDataProvider({ children, value }: Props) {
  // When seeded with a value (tests / non-network callers), skip the fetch
  // entirely and provide the manifest directly.
  if (value) {
    return (
      <PhotoDataContext.Provider value={value}>
        {children}
      </PhotoDataContext.Provider>
    )
  }

  return <FetchingPhotoDataProvider>{children}</FetchingPhotoDataProvider>
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: PhotoData }

function FetchingPhotoDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  // Fetch the single manifest document once at the app root.
  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, MANIFEST_COLLECTION, MANIFEST_DOC_ID))
      .then(snapshot => {
        if (cancelled) return
        setState({ status: 'ready', data: snapshot.data() as PhotoData })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="photo-data-loading" data-testid="photo-data-loading">
        loading…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="photo-data-error" data-testid="photo-data-error">
        could not load photos
      </div>
    )
  }

  return (
    <PhotoDataContext.Provider value={state.data}>
      {children}
    </PhotoDataContext.Provider>
  )
}
