import { describe, it, expect, vi } from 'vitest'
import { reconcilePhotoOrder, orderBySlugList } from './orderReconcile'

type Current = { slug: string; date: string | null; collectionIds: string[] }

describe('reconcilePhotoOrder', () => {
  it('preserves the manual relative order of surviving slugs', () => {
    const prev = { photoOrder: ['b', 'a', 'c'] }
    const current: Current[] = [
      { slug: 'a', date: '2026-01-01', collectionIds: [] },
      { slug: 'b', date: '2026-01-02', collectionIds: [] },
      { slug: 'c', date: '2026-01-03', collectionIds: [] },
    ]
    const { next } = reconcilePhotoOrder(prev, current)
    expect(next.photoOrder).toEqual(['b', 'a', 'c'])
  })

  it('date-anchors a new photo before the first strictly-older surviving entry', () => {
    const prev = { photoOrder: ['new', 'old'] }
    const current: Current[] = [
      { slug: 'new', date: '2026-06-10', collectionIds: [] },
      { slug: 'old', date: '2026-06-01', collectionIds: [] },
      { slug: 'mid', date: '2026-06-05', collectionIds: [] }, // not in prev
    ]
    const { next } = reconcilePhotoOrder(prev, current)
    // mid (06-05) lands before 'old' (06-01) but after 'new' (06-10)
    expect(next.photoOrder).toEqual(['new', 'mid', 'old'])
  })

  it('inserts a newest photo at the top', () => {
    const prev = { photoOrder: ['a', 'b'] }
    const current: Current[] = [
      { slug: 'a', date: '2026-06-05', collectionIds: [] },
      { slug: 'b', date: '2026-06-01', collectionIds: [] },
      { slug: 'fresh', date: '2026-06-20', collectionIds: [] },
    ]
    const { next } = reconcilePhotoOrder(prev, current)
    expect(next.photoOrder).toEqual(['fresh', 'a', 'b'])
  })

  it('drops slugs for removed photos', () => {
    const prev = { photoOrder: ['a', 'gone', 'b'] }
    const current: Current[] = [
      { slug: 'a', date: '2026-06-02', collectionIds: [] },
      { slug: 'b', date: '2026-06-01', collectionIds: [] },
    ]
    const { next, warnings } = reconcilePhotoOrder(prev, current)
    expect(next.photoOrder).toEqual(['a', 'b'])
    expect(warnings.some(w => w.includes('gone'))).toBe(true)
  })

  it('de-dups repeated slugs, first occurrence wins', () => {
    const prev = { photoOrder: ['a', 'b', 'a'] }
    const current: Current[] = [
      { slug: 'a', date: '2026-06-02', collectionIds: [] },
      { slug: 'b', date: '2026-06-01', collectionIds: [] },
    ]
    const { next } = reconcilePhotoOrder(prev, current)
    expect(next.photoOrder).toEqual(['a', 'b'])
  })

  it('treats a photo missing from the list as new and inserts it by date', () => {
    const prev = { photoOrder: ['a', 'c'] }
    const current: Current[] = [
      { slug: 'a', date: '2026-06-03', collectionIds: [] },
      { slug: 'b', date: '2026-06-02', collectionIds: [] }, // missing entirely
      { slug: 'c', date: '2026-06-01', collectionIds: [] },
    ]
    const { next } = reconcilePhotoOrder(prev, current)
    expect(next.photoOrder).toEqual(['a', 'b', 'c'])
  })

  it('self-heals a malformed file without throwing', () => {
    const current: Current[] = [
      { slug: 'a', date: '2026-06-02', collectionIds: [] },
      { slug: 'b', date: '2026-06-01', collectionIds: [] },
    ]
    expect(() => reconcilePhotoOrder(null, current)).not.toThrow()
    const { next } = reconcilePhotoOrder({ photoOrder: 'nonsense' }, current)
    // all photos treated as new, date-descending
    expect(next.photoOrder).toEqual(['a', 'b'])
  })

  it('is idempotent on already-normalized input', () => {
    const current: Current[] = [
      { slug: 'a', date: '2026-06-03', collectionIds: [] },
      { slug: 'b', date: '2026-06-02', collectionIds: [] },
      { slug: 'c', date: '2026-06-01', collectionIds: [] },
    ]
    const first = reconcilePhotoOrder({ photoOrder: [] }, current)
    const second = reconcilePhotoOrder(first.next, current)
    expect(second.next.photoOrder).toEqual(first.next.photoOrder)
  })

  it('defaults an empty order to newest-first by date', () => {
    const current: Current[] = [
      { slug: 'old', date: '2026-06-01', collectionIds: [] },
      { slug: 'new', date: '2026-06-10', collectionIds: [] },
      { slug: 'mid', date: '2026-06-05', collectionIds: [] },
    ]
    const { next } = reconcilePhotoOrder({ photoOrder: [] }, current)
    expect(next.photoOrder).toEqual(['new', 'mid', 'old'])
  })

  it('warns on unknown slugs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { warnings } = reconcilePhotoOrder(
      { photoOrder: ['typo'] },
      [{ slug: 'a', date: '2026-06-01', collectionIds: [] }],
    )
    expect(warnings.length).toBeGreaterThan(0)
    warn.mockRestore()
  })
})

describe('orderBySlugList', () => {
  type P = { slug: string }

  it('orders items by their position in the slug list', () => {
    const items: P[] = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
    expect(orderBySlugList(items, ['c', 'a', 'b']).map(p => p.slug)).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('appends items absent from the slug list, in original order', () => {
    const items: P[] = [{ slug: 'x' }, { slug: 'a' }, { slug: 'y' }]
    expect(orderBySlugList(items, ['a']).map(p => p.slug)).toEqual([
      'a',
      'x',
      'y',
    ])
  })
})
