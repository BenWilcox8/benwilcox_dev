import { describe, it, expect } from 'vitest'
import { orderPhotosByDateDescending } from './photoOrder'

// Minimal shape: the ordering helper only depends on `date`.
type Dated = { slug: string; date: string | null }

describe('orderPhotosByDateDescending', () => {
  // Tracer slice: newest date comes first.
  it('sorts dated photos newest-first', () => {
    const input: Dated[] = [
      { slug: 'old', date: '2026-06-08' },
      { slug: 'new', date: '2026-06-19' },
      { slug: 'mid', date: '2026-06-12' },
    ]
    expect(orderPhotosByDateDescending(input).map(p => p.slug)).toEqual([
      'new',
      'mid',
      'old',
    ])
  })

  // Undated photos always sink to the end, regardless of input position.
  it('places undated photos last', () => {
    const input: Dated[] = [
      { slug: 'no-date', date: null },
      { slug: 'new', date: '2026-06-19' },
      { slug: 'old', date: '2026-06-08' },
    ]
    expect(orderPhotosByDateDescending(input).map(p => p.slug)).toEqual([
      'new',
      'old',
      'no-date',
    ])
  })

  // Pure: does not mutate the caller's array.
  it('does not mutate the input array', () => {
    const input: Dated[] = [
      { slug: 'old', date: '2026-06-08' },
      { slug: 'new', date: '2026-06-19' },
    ]
    const before = input.map(p => p.slug)
    orderPhotosByDateDescending(input)
    expect(input.map(p => p.slug)).toEqual(before)
  })
})
