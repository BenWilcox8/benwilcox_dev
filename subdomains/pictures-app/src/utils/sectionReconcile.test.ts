import { describe, it, expect } from 'vitest'
import { reconcileSections } from './sectionReconcile'

type Discovered = {
  id: string
  name: string
  color: string
  newestDate: string | null
  photoCount: number
}

describe('reconcileSections', () => {
  it('preserves existing section order, name, and color', () => {
    const prev = {
      sections: [
        { id: 'street', name: 'Street Life', color: '#111111' },
        { id: 'nature', name: 'Wild Nature', color: '#222222' },
      ],
    }
    const discovered: Discovered[] = [
      { id: 'nature', name: 'nature', color: '#999999', newestDate: '2026-01-01', photoCount: 3 },
      { id: 'street', name: 'street', color: '#888888', newestDate: '2026-02-01', photoCount: 2 },
    ]
    const { next } = reconcileSections(prev, discovered)
    expect(next.sections).toEqual([
      { id: 'street', name: 'Street Life', color: '#111111' },
      { id: 'nature', name: 'Wild Nature', color: '#222222' },
    ])
  })

  it('inserts a newly-discovered collection by its newest photo date (recent toward top)', () => {
    const prev = {
      sections: [
        { id: 'old', name: 'old', color: '#111111' },
      ],
    }
    const discovered: Discovered[] = [
      { id: 'old', name: 'old', color: '#111111', newestDate: '2026-01-01', photoCount: 1 },
      { id: 'fresh', name: 'fresh', color: '#222222', newestDate: '2026-06-01', photoCount: 2 },
    ]
    const { next } = reconcileSections(prev, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['fresh', 'old'])
  })

  it('drops sections with zero photos', () => {
    const prev = {
      sections: [
        { id: 'gone', name: 'gone', color: '#111111' },
        { id: 'kept', name: 'kept', color: '#222222' },
      ],
    }
    const discovered: Discovered[] = [
      { id: 'gone', name: 'gone', color: '#111111', newestDate: null, photoCount: 0 },
      { id: 'kept', name: 'kept', color: '#222222', newestDate: '2026-01-01', photoCount: 1 },
    ]
    const { next } = reconcileSections(prev, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['kept'])
  })

  it('drops sections that no longer exist in the library', () => {
    const prev = { sections: [{ id: 'removed', name: 'removed', color: '#111111' }] }
    const discovered: Discovered[] = [
      { id: 'a', name: 'a', color: '#222222', newestDate: '2026-01-01', photoCount: 1 },
    ]
    const { next } = reconcileSections(prev, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['a'])
  })

  it('always sinks uncategorized to the bottom', () => {
    const prev = {
      sections: [
        { id: 'uncategorized', name: 'uncategorized', color: '#111111' },
        { id: 'street', name: 'Street', color: '#222222' },
      ],
    }
    const discovered: Discovered[] = [
      { id: 'uncategorized', name: 'uncategorized', color: '#111111', newestDate: '2026-06-01', photoCount: 1 },
      { id: 'street', name: 'Street', color: '#222222', newestDate: '2026-01-01', photoCount: 1 },
    ]
    const { next } = reconcileSections(prev, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['street', 'uncategorized'])
  })

  it('appends a newly-discovered uncategorized at the bottom, below new collections', () => {
    const discovered: Discovered[] = [
      { id: 'uncategorized', name: 'uncategorized', color: '#111111', newestDate: '2026-12-01', photoCount: 1 },
      { id: 'street', name: 'Street', color: '#222222', newestDate: '2026-01-01', photoCount: 1 },
    ]
    const { next } = reconcileSections({ sections: [] }, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['street', 'uncategorized'])
  })

  it('self-heals malformed input without throwing', () => {
    const discovered: Discovered[] = [
      { id: 'a', name: 'a', color: '#222222', newestDate: '2026-01-01', photoCount: 1 },
    ]
    expect(() => reconcileSections(null, discovered)).not.toThrow()
    const { next } = reconcileSections({ sections: 'nonsense' }, discovered)
    expect(next.sections.map(s => s.id)).toEqual(['a'])
  })

  it('is idempotent on already-normalized input', () => {
    const discovered: Discovered[] = [
      { id: 'b', name: 'b', color: '#222222', newestDate: '2026-06-01', photoCount: 1 },
      { id: 'a', name: 'a', color: '#111111', newestDate: '2026-01-01', photoCount: 1 },
    ]
    const first = reconcileSections({ sections: [] }, discovered)
    const second = reconcileSections(first.next, discovered)
    expect(second.next.sections).toEqual(first.next.sections)
  })
})
