import { describe, it, expect } from 'vitest'
import { orderPhotosByDateDescending } from './photoOrder'

// Minimal shape: the ordering helper depends on `date` and optional `dateTime`.
type Dated = { slug: string; date: string | null; dateTime?: string | null }

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

  // Same-day photos are ordered by time (newest capture first).
  it('orders same-day photos by time when dateTime is present', () => {
    const input: Dated[] = [
      { slug: 'morning', date: '2026-06-19', dateTime: '2026-06-19T08:07:00' },
      { slug: 'evening', date: '2026-06-19', dateTime: '2026-06-19T19:35:00' },
      { slug: 'noon', date: '2026-06-19', dateTime: '2026-06-19T12:00:00' },
    ]
    expect(orderPhotosByDateDescending(input).map(p => p.slug)).toEqual([
      'evening',
      'noon',
      'morning',
    ])
  })

  // A timed capture sorts as later than a date-only capture on the same day.
  it('sorts a timed photo after a date-only photo on the same day', () => {
    const input: Dated[] = [
      { slug: 'date-only', date: '2026-06-19' },
      { slug: 'timed', date: '2026-06-19', dateTime: '2026-06-19T09:00:00' },
    ]
    expect(orderPhotosByDateDescending(input).map(p => p.slug)).toEqual([
      'timed',
      'date-only',
    ])
  })

  // dateTime still dominates the coarse date across different days.
  it('orders across days by dateTime', () => {
    const input: Dated[] = [
      { slug: 'old-late', date: '2026-06-18', dateTime: '2026-06-18T23:59:00' },
      { slug: 'new-early', date: '2026-06-19', dateTime: '2026-06-19T00:01:00' },
    ]
    expect(orderPhotosByDateDescending(input).map(p => p.slug)).toEqual([
      'new-early',
      'old-late',
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
