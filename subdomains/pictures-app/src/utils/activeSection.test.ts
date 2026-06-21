import { describe, it, expect } from 'vitest'
import { activeSection } from './activeSection'

type SectionTop = { id: string; top: number }

describe('activeSection', () => {
  // Acceptance criterion: returns id of topmost section at/above the offset
  it('returns the topmost section whose top is at or above the offset', () => {
    const sections: SectionTop[] = [
      { id: 'a', top: -200 },
      { id: 'b', top: -50 },
      { id: 'c', top: 300 },
    ]
    // 'b' is the last one at/above offset 0; 'c' is below
    expect(activeSection(sections, 0)).toBe('b')
  })

  it('returns the first section when all tops are below the offset (scrolled above)', () => {
    const sections: SectionTop[] = [
      { id: 'a', top: 100 },
      { id: 'b', top: 400 },
      { id: 'c', top: 800 },
    ]
    expect(activeSection(sections, 0)).toBe('a')
  })

  it('returns the first section when all tops are below a non-zero offset', () => {
    const sections: SectionTop[] = [
      { id: 'hero', top: 80 },
      { id: 'gallery', top: 500 },
    ]
    expect(activeSection(sections, 64)).toBe('hero')
  })

  // Exact-boundary: top exactly equals offset counts as at/above
  it('handles exact-boundary: a section top exactly at the offset counts as active', () => {
    const sections: SectionTop[] = [
      { id: 'a', top: -100 },
      { id: 'b', top: 64 },
      { id: 'c', top: 200 },
    ]
    expect(activeSection(sections, 64)).toBe('b')
  })

  it('exact-boundary: first section top exactly at zero offset', () => {
    const sections: SectionTop[] = [
      { id: 'first', top: 0 },
      { id: 'second', top: 500 },
    ]
    expect(activeSection(sections, 0)).toBe('first')
  })

  it('exact-boundary: multiple sections exactly at offset returns the last one (topmost in view)', () => {
    // Both 'a' and 'b' are at/above offset 0; last one wins (it's the one you're scrolled into)
    const sections: SectionTop[] = [
      { id: 'a', top: 0 },
      { id: 'b', top: 0 },
      { id: 'c', top: 400 },
    ]
    expect(activeSection(sections, 0)).toBe('b')
  })

  // Single-section edge case
  it('returns the single section id regardless of its top position', () => {
    expect(activeSection([{ id: 'only', top: 500 }], 0)).toBe('only')
    expect(activeSection([{ id: 'only', top: -500 }], 0)).toBe('only')
    expect(activeSection([{ id: 'only', top: 0 }], 0)).toBe('only')
  })

  // Empty-input edge case
  it('returns undefined for empty input', () => {
    expect(activeSection([], 0)).toBeUndefined()
  })

  // Typical scroll scenario: scrolled past first two, third partially visible
  it('selects the correct section during mid-page scroll', () => {
    const sections: SectionTop[] = [
      { id: 'portraits', top: -1200 },
      { id: 'street', top: -400 },
      { id: 'nature', top: 150 },
      { id: 'abstract', top: 900 },
    ]
    // offset = 80 (sticky header height); 'street' top (-400) is at/above 80, 'nature' (150) is below
    expect(activeSection(sections, 80)).toBe('street')
  })

  it('uses the offset parameter correctly (non-zero offset)', () => {
    const sections: SectionTop[] = [
      { id: 'a', top: 60 },  // below offset 80
      { id: 'b', top: 300 }, // below offset 80
    ]
    expect(activeSection(sections, 80)).toBe('a')
  })
})
