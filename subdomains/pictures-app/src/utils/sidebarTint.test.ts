import { describe, it, expect } from 'vitest'
import { resolveFirstCollectionColor } from './sidebarTint'
import type { Collection } from '../types/photos'

const cols: Collection[] = [
  { id: 'a', name: 'A', color: '#111111' },
  { id: 'b', name: 'B', color: '#222222' },
  { id: 'c', name: 'C', color: '#333333' },
]

describe('resolveFirstCollectionColor', () => {
  it('returns the color of the first (highest-precedence) collection on the photo', () => {
    expect(resolveFirstCollectionColor(['b', 'c'], cols)).toBe('#222222')
  })

  it('skips ids that are not real collections and uses the first that resolves', () => {
    expect(resolveFirstCollectionColor(['ghost', 'c'], cols)).toBe('#333333')
  })

  it('returns null when the photo has no collections', () => {
    expect(resolveFirstCollectionColor([], cols)).toBeNull()
  })

  it('returns null when none of the photo collections resolve', () => {
    expect(resolveFirstCollectionColor(['ghost', 'phantom'], cols)).toBeNull()
  })
})
