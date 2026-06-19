import { describe, it, expect } from 'vitest'
import { resolveAdjacentSlug } from './photoNav'

const slugs = ['alpha', 'beta', 'gamma', 'delta']

describe('resolveAdjacentSlug', () => {
  // Tracer slice: next from middle
  it('returns the next slug when moving right from a middle photo', () => {
    expect(resolveAdjacentSlug(slugs, 'beta', 'right')).toBe('gamma')
  })

  // Prev from middle
  it('returns the previous slug when moving left from a middle photo', () => {
    expect(resolveAdjacentSlug(slugs, 'gamma', 'left')).toBe('beta')
  })

  // No-wrap at last
  it('returns null when moving right from the last photo', () => {
    expect(resolveAdjacentSlug(slugs, 'delta', 'right')).toBeNull()
  })

  // No-wrap at first
  it('returns null when moving left from the first photo', () => {
    expect(resolveAdjacentSlug(slugs, 'alpha', 'left')).toBeNull()
  })

  // Unknown slug
  it('returns null when the current slug is not in the list', () => {
    expect(resolveAdjacentSlug(slugs, 'unknown', 'right')).toBeNull()
  })

  // Single photo list
  it('returns null for both directions when there is only one photo', () => {
    expect(resolveAdjacentSlug(['solo'], 'solo', 'right')).toBeNull()
    expect(resolveAdjacentSlug(['solo'], 'solo', 'left')).toBeNull()
  })

  // From first going right
  it('returns the second slug when moving right from the first photo', () => {
    expect(resolveAdjacentSlug(slugs, 'alpha', 'right')).toBe('beta')
  })

  // From last going left
  it('returns the second-to-last slug when moving left from the last photo', () => {
    expect(resolveAdjacentSlug(slugs, 'delta', 'left')).toBe('gamma')
  })
})
