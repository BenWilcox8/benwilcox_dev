import { describe, it, expect } from 'vitest'
import { computeAspectRatio, MIN_ASPECT_RATIO, MAX_ASPECT_RATIO } from './aspectRatio'

describe('computeAspectRatio', () => {
  it('returns width / height for a normal landscape photo', () => {
    expect(computeAspectRatio(3000, 2000)).toBeCloseTo(1.5)
  })

  it('returns a ratio below 1 for a portrait photo', () => {
    expect(computeAspectRatio(2000, 3000)).toBeCloseTo(0.667, 2)
  })

  it('clamps an extreme panorama to the maximum ratio', () => {
    expect(computeAspectRatio(6000, 1000)).toBe(MAX_ASPECT_RATIO)
  })

  it('clamps an extreme tall photo to the minimum ratio', () => {
    expect(computeAspectRatio(1000, 6000)).toBe(MIN_ASPECT_RATIO)
  })

  it('falls back to 1 when dimensions are missing', () => {
    expect(computeAspectRatio(0, 0)).toBe(1)
    expect(computeAspectRatio(3000, 0)).toBe(1)
  })
})
