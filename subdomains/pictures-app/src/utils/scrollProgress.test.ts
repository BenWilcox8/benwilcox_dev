import { describe, it, expect } from 'vitest'
import { scrollProgress } from './scrollProgress'

describe('scrollProgress', () => {
  it('is 0 at the top of the page', () => {
    expect(scrollProgress(0, 2000, 800)).toBe(0)
  })

  it('is 1 at the very bottom (scrollTop === scrollHeight - clientHeight)', () => {
    expect(scrollProgress(1200, 2000, 800)).toBe(1)
  })

  it('is the linear fraction in between', () => {
    // scrollable = 1200; halfway = 600 → 0.5
    expect(scrollProgress(600, 2000, 800)).toBeCloseTo(0.5, 5)
  })

  it('returns 0 when the page is not scrollable (content fits the viewport)', () => {
    expect(scrollProgress(0, 800, 800)).toBe(0)
    expect(scrollProgress(0, 500, 800)).toBe(0)
  })

  it('clamps overscroll above 1 and below 0', () => {
    expect(scrollProgress(5000, 2000, 800)).toBe(1)
    expect(scrollProgress(-50, 2000, 800)).toBe(0)
  })
})
