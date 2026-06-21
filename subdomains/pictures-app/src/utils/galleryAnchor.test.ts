import { describe, it, expect } from 'vitest'
import { slugFromHash, galleryHrefForSlug } from './galleryAnchor'

describe('slugFromHash', () => {
  it('extracts the slug from a leading-# hash', () => {
    expect(slugFromHash('#dsc03829')).toBe('dsc03829')
  })

  it('tolerates a hash without the leading #', () => {
    expect(slugFromHash('dsc03829')).toBe('dsc03829')
  })

  it('decodes percent-encoded characters', () => {
    expect(slugFromHash('#a%20b')).toBe('a b')
  })

  it('returns null for an empty hash', () => {
    expect(slugFromHash('')).toBeNull()
  })

  it('returns null for a bare #', () => {
    expect(slugFromHash('#')).toBeNull()
  })
})

describe('galleryHrefForSlug', () => {
  it('builds a root href anchored on the slug', () => {
    expect(galleryHrefForSlug('dsc03829')).toBe('/#dsc03829')
  })
})
