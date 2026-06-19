import { describe, it, expect } from 'vitest'
import { resolveSizeHint } from './sizeHint'

describe('resolveSizeHint', () => {
  it('uses the explicit extended-description size when present, ignoring rating', () => {
    expect(resolveSizeHint('small', 5)).toBe('small')
    expect(resolveSizeHint('large', 0)).toBe('large')
    expect(resolveSizeHint('medium', null)).toBe('medium')
  })

  it('falls back to rating: 0-1 stars is small', () => {
    expect(resolveSizeHint(null, 0)).toBe('small')
    expect(resolveSizeHint(null, 1)).toBe('small')
  })

  it('falls back to rating: 2-3 stars is medium', () => {
    expect(resolveSizeHint(null, 2)).toBe('medium')
    expect(resolveSizeHint(null, 3)).toBe('medium')
  })

  it('falls back to rating: 4-5 stars is large', () => {
    expect(resolveSizeHint(null, 4)).toBe('large')
    expect(resolveSizeHint(null, 5)).toBe('large')
  })

  it('treats an unrated photo (null rating) as small', () => {
    expect(resolveSizeHint(null, null)).toBe('small')
  })
})
