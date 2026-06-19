import { describe, it, expect } from 'vitest'
import { slideIndexForSlug, slugForSlideIndex } from './lightboxNav'

const slugs = ['alpha', 'beta', 'gamma', 'delta']

describe('slideIndexForSlug', () => {
  it('returns the chronological index of a slug', () => {
    expect(slideIndexForSlug(slugs, 'gamma')).toBe(2)
  })

  it('returns 0 for the first slug', () => {
    expect(slideIndexForSlug(slugs, 'alpha')).toBe(0)
  })

  it('returns 0 (clamped) when the slug is unknown', () => {
    expect(slideIndexForSlug(slugs, 'unknown')).toBe(0)
  })
})

describe('slugForSlideIndex', () => {
  it('maps an index back to its slug', () => {
    expect(slugForSlideIndex(slugs, 1)).toBe('beta')
  })

  it('clamps an index past the end to the last slug (finite, no wrap)', () => {
    expect(slugForSlideIndex(slugs, 99)).toBe('delta')
  })

  it('clamps a negative index to the first slug', () => {
    expect(slugForSlideIndex(slugs, -3)).toBe('alpha')
  })

  it('returns null for an empty list', () => {
    expect(slugForSlideIndex([], 0)).toBeNull()
  })
})

describe('index <-> slug round trip', () => {
  it('is a stable round trip for every slug', () => {
    for (const slug of slugs) {
      expect(slugForSlideIndex(slugs, slideIndexForSlug(slugs, slug))).toBe(slug)
    }
  })
})
