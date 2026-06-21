import { describe, it, expect } from 'vitest'
import { sectionFractions } from './sectionFractions'

describe('sectionFractions', () => {
  it('returns [] for no headers', () => {
    expect(sectionFractions([], 1000, 64)).toEqual([])
  })

  it('maps each header to (top - activeOffset) / maxScroll', () => {
    // maxScroll = 1000, activeOffset = 0 for a clean ratio
    const result = sectionFractions(
      [
        { id: 'a', top: 0 },
        { id: 'b', top: 250 },
        { id: 'c', top: 900 },
      ],
      1000,
      0,
    )
    expect(result[0].fraction).toBeCloseTo(0, 5)
    expect(result[1].fraction).toBeCloseTo(0.25, 5)
    expect(result[2].fraction).toBeCloseTo(0.9, 5)
  })

  it('subtracts the active offset before dividing', () => {
    // top 164, activeOffset 64, maxScroll 1000 → (164-64)/1000 = 0.1
    const result = sectionFractions([{ id: 'a', top: 164 }], 1000, 64)
    expect(result[0].fraction).toBeCloseTo(0.1, 5)
  })

  it('clamps to [0, 1]', () => {
    const result = sectionFractions(
      [
        { id: 'above', top: 10 }, // 10-64 < 0 → 0
        { id: 'below', top: 5000 }, // far past the bottom → 1
      ],
      1000,
      64,
    )
    expect(result[0].fraction).toBe(0)
    expect(result[1].fraction).toBe(1)
  })

  it('falls back to even spacing when the page is not scrollable', () => {
    const result = sectionFractions(
      [
        { id: 'a', top: 0 },
        { id: 'b', top: 100 },
        { id: 'c', top: 200 },
      ],
      0,
      64,
    )
    expect(result.map(r => r.fraction)).toEqual([0, 0.5, 1])
  })

  it('places a single header at the top under the not-scrollable fallback', () => {
    const result = sectionFractions([{ id: 'a', top: 0 }], 0, 64)
    expect(result[0].fraction).toBe(0)
  })

  it('preserves id order', () => {
    const result = sectionFractions(
      [
        { id: 'x', top: 0 },
        { id: 'y', top: 500 },
      ],
      1000,
      0,
    )
    expect(result.map(r => r.id)).toEqual(['x', 'y'])
  })
})
