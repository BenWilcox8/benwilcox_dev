import { describe, it, expect } from 'vitest'
import { resolveBackTarget } from './backNav'

describe('resolveBackTarget', () => {
  // Tracer slice: deep link / fresh load has history index 0 -> no prior entry.
  it("returns 'gallery' when the history index is 0 (deep link / refresh)", () => {
    expect(resolveBackTarget(0)).toBe('gallery')
  })

  // No history state at all (idx unavailable).
  it("returns 'gallery' when the history index is null", () => {
    expect(resolveBackTarget(null)).toBe('gallery')
  })

  it("returns 'gallery' when the history index is undefined", () => {
    expect(resolveBackTarget(undefined)).toBe('gallery')
  })

  // There is a prior in-app entry to go back to.
  it("returns 'back' when the history index is 1", () => {
    expect(resolveBackTarget(1)).toBe('back')
  })

  it("returns 'back' when the history index is greater than 1", () => {
    expect(resolveBackTarget(5)).toBe('back')
  })
})
