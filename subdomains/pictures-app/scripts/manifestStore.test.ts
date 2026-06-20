import { describe, it, expect, vi, beforeEach } from 'vitest'

// Admin SDK Firestore is mocked: these tests prove the read-previous →
// reconcile → write-back seam (issue #41) without a live Firestore / emulator.
const getMock = vi.fn()
const setMock = vi.fn()
const docMock = vi.fn(() => ({ get: getMock, set: setMock }))
const collectionMock = vi.fn(() => ({ doc: docMock }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: collectionMock }),
}))

import { readManifest, writeManifest, readRawUrls } from './manifestStore'

beforeEach(() => {
  getMock.mockReset()
  setMock.mockReset()
  docMock.mockClear()
  collectionMock.mockClear()
})

describe('manifestStore', () => {
  it('reads the previous manifest document data from Firestore', async () => {
    const data = { galleryOrder: ['a', 'b'], collections: [], photos: [] }
    getMock.mockResolvedValue({ exists: true, data: () => data })

    const result = await readManifest()

    expect(result).toEqual(data)
  })

  it('returns null when the manifest document does not yet exist', async () => {
    getMock.mockResolvedValue({ exists: false, data: () => undefined })

    const result = await readManifest()

    expect(result).toBeNull()
  })

  it('writes the manifest back to the single manifest document', async () => {
    setMock.mockResolvedValue(undefined)
    const manifest = { galleryOrder: ['a'], collections: [], photos: [] }

    await writeManifest(manifest)

    expect(setMock).toHaveBeenCalledWith(manifest)
  })

  it('reads the rawUrl already recorded for each slug from the previous manifest', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        galleryOrder: [],
        collections: [],
        photos: [
          { slug: 'a', rawUrl: 'https://raw/a' },
          { slug: 'b', rawUrl: null },
        ],
      }),
    })

    const map = await readRawUrls()

    expect(map).toEqual({ a: 'https://raw/a' })
  })
})
