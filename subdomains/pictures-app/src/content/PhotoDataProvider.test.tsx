import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PhotoDataProvider } from './PhotoDataProvider'
import { usePhotoData } from './photoData'
import type { PhotoData } from './photoData'

// Mock the Firestore read at the seam the provider uses. `getDoc` is the only
// network call; we control whether it resolves with data or rejects.
const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc: (...args: unknown[]) => getDoc(...args),
}))
vi.mock('../firebase', () => ({
  db: {},
  MANIFEST_COLLECTION: 'gallery',
  MANIFEST_DOC_ID: 'manifest',
}))

function manifestSnapshot(data: PhotoData) {
  return { exists: () => true, data: () => data }
}

const fixture: PhotoData = {
  photos: [
    {
      slug: 'a',
      collections: ['c1'],
      explicitSize: null,
      aspectRatio: 1.5,
      thumbSrc: '/thumbs/a.webp',
      displaySrc: '/display/a.webp',
      fullSrc: '/photos/A.jpg',
      rawUrl: null,
      date: '2026-01-01',
      location: null,
      title: null,
      caption: null,
      rating: null,
      exif: {
        aperture: null,
        shutter: null,
        iso: null,
        focalLength: null,
        camera: null,
        lens: null,
      },
      edits: null,
    },
  ],
  collections: [{ id: 'c1', name: 'Coll One', color: '#abcabc' }],
  galleryOrder: ['a'],
}

function Probe() {
  const { photos, collections, galleryOrder } = usePhotoData()
  return (
    <div>
      <span data-testid="photo-slug">{photos[0].slug}</span>
      <span data-testid="collection-name">{collections[0].name}</span>
      <span data-testid="order">{galleryOrder.join(',')}</span>
    </div>
  )
}

describe('PhotoDataProvider fetch path', () => {
  beforeEach(() => {
    getDoc.mockReset()
  })

  it('shows a loading state while the manifest read is in flight', () => {
    // Never-resolving fetch keeps the provider in its loading state.
    getDoc.mockReturnValue(new Promise(() => {}))

    render(
      <PhotoDataProvider>
        <Probe />
      </PhotoDataProvider>,
    )

    expect(screen.getByTestId('photo-data-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-slug')).not.toBeInTheDocument()
  })

  it('renders children from the fetched manifest once the read resolves', async () => {
    getDoc.mockResolvedValue(manifestSnapshot(fixture))

    render(
      <PhotoDataProvider>
        <Probe />
      </PhotoDataProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('photo-slug').textContent).toBe('a')
    })
    expect(screen.getByTestId('collection-name').textContent).toBe('Coll One')
    expect(screen.getByTestId('order').textContent).toBe('a')
  })

  it('shows a distinct error state when the manifest read fails', async () => {
    getDoc.mockRejectedValue(new Error('network down'))

    render(
      <PhotoDataProvider>
        <Probe />
      </PhotoDataProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('photo-data-error')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('photo-slug')).not.toBeInTheDocument()
    expect(screen.queryByTestId('photo-data-loading')).not.toBeInTheDocument()
  })
})

describe('PhotoDataProvider seeded with value', () => {
  it('exposes the seeded photos, collections, and galleryOrder via usePhotoData', () => {
    render(
      <PhotoDataProvider value={fixture}>
        <Probe />
      </PhotoDataProvider>,
    )

    expect(screen.getByTestId('photo-slug').textContent).toBe('a')
    expect(screen.getByTestId('collection-name').textContent).toBe('Coll One')
    expect(screen.getByTestId('order').textContent).toBe('a')
  })
})
