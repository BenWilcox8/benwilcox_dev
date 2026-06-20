import { describe, it, expect } from 'vitest'
import { reconcileManifest } from './manifestReconcile'
import type { CurrentPhoto } from './orderReconcile'
import type { DiscoveredCollection } from './sectionReconcile'

describe('reconcileManifest', () => {
  it('reads previous photo order from the manifest and preserves it', () => {
    const prevManifest = {
      galleryOrder: ['b', 'a', 'c'],
      collections: [],
    }
    const current: CurrentPhoto[] = [
      { slug: 'a', date: '2026-01-01', collectionIds: [] },
      { slug: 'b', date: '2026-01-02', collectionIds: [] },
      { slug: 'c', date: '2026-01-03', collectionIds: [] },
    ]
    const discovered: DiscoveredCollection[] = []

    const { galleryOrder } = reconcileManifest(prevManifest, current, discovered)

    expect(galleryOrder).toEqual(['b', 'a', 'c'])
  })

  it('date-anchors a newly-published photo into the curated order and drops a removed one', () => {
    const prevManifest = {
      galleryOrder: ['new', 'gone', 'old'],
      collections: [],
    }
    const current: CurrentPhoto[] = [
      { slug: 'new', date: '2026-06-10', collectionIds: [] },
      { slug: 'old', date: '2026-06-01', collectionIds: [] },
      { slug: 'mid', date: '2026-06-05', collectionIds: [] }, // newly published
      // 'gone' no longer exists in the library
    ]
    const discovered: DiscoveredCollection[] = []

    const { galleryOrder } = reconcileManifest(prevManifest, current, discovered)

    // 'gone' dropped; 'mid' (06-05) anchored after 'new' (06-10), before 'old' (06-01)
    expect(galleryOrder).toEqual(['new', 'mid', 'old'])
  })

  it('preserves console-edited section names, colors, and order from the manifest', () => {
    const prevManifest = {
      galleryOrder: [],
      // The curator renamed/recolored these directly in the Firebase console.
      collections: [
        { id: 'street', name: 'Street Life', color: '#111111' },
        { id: 'nature', name: 'Wild Nature', color: '#222222' },
      ],
    }
    const current: CurrentPhoto[] = []
    // Fresh discovery carries auto-derived (un-curated) names/colors.
    const discovered: DiscoveredCollection[] = [
      { id: 'nature', name: 'nature', color: '#999999', newestDate: '2026-01-01', photoCount: 3 },
      { id: 'street', name: 'street', color: '#888888', newestDate: '2026-02-01', photoCount: 2 },
    ]

    const { collections } = reconcileManifest(prevManifest, current, discovered)

    expect(collections).toEqual([
      { id: 'street', name: 'Street Life', color: '#111111' },
      { id: 'nature', name: 'Wild Nature', color: '#222222' },
    ])
  })
})
