import { describe, it, expect } from 'vitest'
import { computeCircleOffsets } from './circleLayout'

// ----------------------------------------------------------------------------
// Types used in tests (mirrors the exported input type)
// ----------------------------------------------------------------------------
type CollectionInput = { id: string; photoCount: number }

describe('computeCircleOffsets', () => {
  // --------------------------------------------------------------------------
  // AC: Single-collection and empty-input edge cases behave sensibly.
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('returns [] for empty input', () => {
      expect(computeCircleOffsets([], 800, 40)).toEqual([])
    })

    it('returns offset 0 for a single collection', () => {
      const result = computeCircleOffsets([{ id: 'a', photoCount: 10 }], 800, 40)
      expect(result).toEqual([{ id: 'a', offset: 0 }])
    })

    it('handles a single collection with photoCount 0 gracefully (no divide-by-zero)', () => {
      const result = computeCircleOffsets([{ id: 'a', photoCount: 0 }], 800, 40)
      expect(result).toEqual([{ id: 'a', offset: 0 }])
    })

    it('handles all collections with photoCount 0 gracefully (falls back to even spacing)', () => {
      // total photos = 0 → can't do proportional, should fall back to even
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 0 },
        { id: 'b', photoCount: 0 },
        { id: 'c', photoCount: 0 },
      ]
      const result = computeCircleOffsets(collections, 800, 40)
      // Even spacing: 3 circles across 800px → 0, 400, 800
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBe(400)
      expect(result[2].offset).toBe(800)
    })
  })

  // --------------------------------------------------------------------------
  // AC: Given collections with varying photo counts, offsets are proportional
  //     to cumulative-photos-before ÷ total.
  // --------------------------------------------------------------------------
  describe('proportional offsets', () => {
    it('first collection always has offset 0 (zero cumulative photos before it)', () => {
      const collections: CollectionInput[] = [
        { id: 'nature', photoCount: 30 },
        { id: 'street', photoCount: 10 },
        { id: 'misc', photoCount: 60 },
      ]
      const result = computeCircleOffsets(collections, 1000, 1)
      expect(result[0].offset).toBe(0)
    })

    it('computes proportional base offsets for equally-sized collections', () => {
      // 2 equal collections in a 1000px rail → offsets 0 and 500
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 50 },
        { id: 'b', photoCount: 50 },
      ]
      const result = computeCircleOffsets(collections, 1000, 1)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBe(500)
    })

    it('offsets reflect cumulative photo counts: 10/100/10 split across 1000px', () => {
      // total = 120; cumulative before: [0, 10, 110]
      // base offsets: [0, 10/120*1000, 110/120*1000] ≈ [0, 83.33, 916.67]
      const collections: CollectionInput[] = [
        { id: 'small', photoCount: 10 },
        { id: 'big', photoCount: 100 },
        { id: 'small2', photoCount: 10 },
      ]
      const result = computeCircleOffsets(collections, 1000, 1)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBeCloseTo(10 / 120 * 1000, 1)
      expect(result[2].offset).toBeCloseTo(110 / 120 * 1000, 1)
    })

    it('output ids match input order', () => {
      const collections: CollectionInput[] = [
        { id: 'x', photoCount: 5 },
        { id: 'y', photoCount: 15 },
        { id: 'z', photoCount: 30 },
      ]
      const result = computeCircleOffsets(collections, 800, 1)
      expect(result.map(r => r.id)).toEqual(['x', 'y', 'z'])
    })

    it('three collections: verify exact proportional positions', () => {
      // 10 + 30 + 60 = 100 total; base offsets at [0, 10%, 40%] of 1000
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 10 },
        { id: 'b', photoCount: 30 },
        { id: 'c', photoCount: 60 },
      ]
      const result = computeCircleOffsets(collections, 1000, 1)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBeCloseTo(100, 1)  // 10/100 * 1000
      expect(result[2].offset).toBeCloseTo(400, 1)  // 40/100 * 1000
    })
  })

  // --------------------------------------------------------------------------
  // AC: Adjacent circles are always at least the minimum gap apart, even when
  //     photo counts place them close together.
  // --------------------------------------------------------------------------
  describe('minimum gap enforcement', () => {
    it('pushes circles apart when base offsets are closer than minGap', () => {
      // Two collections, one huge (99%) and one tiny (1%), in a 100px rail
      // Base offsets: [0, 99/100*100] = [0, 99]. minGap=40 → second must be >= 40
      const collections: CollectionInput[] = [
        { id: 'big', photoCount: 99 },
        { id: 'tiny', photoCount: 1 },
      ]
      const result = computeCircleOffsets(collections, 100, 40)
      expect(result[1].offset).toBeGreaterThanOrEqual(result[0].offset + 40)
    })

    it('does not push circles further than needed (base offsets already satisfy gap)', () => {
      // Equal split → offsets 0 and 500, gap = 500, minGap = 40 → no push needed
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 50 },
        { id: 'b', photoCount: 50 },
      ]
      const result = computeCircleOffsets(collections, 1000, 40)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBe(500)
    })

    it('cascades minimum gap: pushing one circle can push the next too', () => {
      // 4 collections with 99/0.33/0.33/0.33 photo count → everything bunches at top
      // after proportional layout; minGap=40 means offsets must be 0, 40, 80, 120
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 99 },
        { id: 'b', photoCount: 1 },
        { id: 'c', photoCount: 1 },
        { id: 'd', photoCount: 1 },
      ]
      // Rail is tall enough to fit the min gaps
      const result = computeCircleOffsets(collections, 1000, 40)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].offset).toBeGreaterThanOrEqual(result[i - 1].offset + 40)
      }
    })

    it('honors minGap across all adjacent pairs regardless of count', () => {
      // 5 collections where proportional layout would cluster first 3 very close
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 1 },
        { id: 'b', photoCount: 1 },
        { id: 'c', photoCount: 1 },
        { id: 'd', photoCount: 50 },
        { id: 'e', photoCount: 50 },
      ]
      const result = computeCircleOffsets(collections, 1000, 40)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].offset).toBeGreaterThanOrEqual(result[i - 1].offset + 40)
      }
    })
  })

  // --------------------------------------------------------------------------
  // AC: When minimum gaps cannot all fit in the rail height, the function falls
  //     back to even spacing.
  // --------------------------------------------------------------------------
  describe('even-spacing fallback', () => {
    it('falls back to even spacing when (n-1)*minGap > railHeight', () => {
      // 5 collections, minGap=300, railHeight=500
      // (5-1)*300 = 1200 > 500 → fallback to even
      // Even spacing for 5 circles: 0, 125, 250, 375, 500
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 20 },
        { id: 'b', photoCount: 20 },
        { id: 'c', photoCount: 20 },
        { id: 'd', photoCount: 20 },
        { id: 'e', photoCount: 20 },
      ]
      const result = computeCircleOffsets(collections, 500, 300)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBe(125)
      expect(result[2].offset).toBe(250)
      expect(result[3].offset).toBe(375)
      expect(result[4].offset).toBe(500)
    })

    it('2 collections exactly at (n-1)*minGap == railHeight: still fits, no fallback', () => {
      // 2 collections, minGap=500, railHeight=500 → (2-1)*500 = 500, equal → still fits
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 50 },
        { id: 'b', photoCount: 50 },
      ]
      const result = computeCircleOffsets(collections, 500, 500)
      // Proportional base: 0 and 250; pushed to 0 and 500 (minGap satisfied at rail edge)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBeGreaterThanOrEqual(500)
    })

    it('fallback even-spacing distributes n circles from 0 to railHeight', () => {
      // 3 circles, railHeight=100, minGap=100 → (3-1)*100=200 > 100 → fallback
      const collections: CollectionInput[] = [
        { id: 'a', photoCount: 10 },
        { id: 'b', photoCount: 10 },
        { id: 'c', photoCount: 10 },
      ]
      const result = computeCircleOffsets(collections, 100, 100)
      expect(result[0].offset).toBe(0)
      expect(result[1].offset).toBe(50)
      expect(result[2].offset).toBe(100)
    })

    it('fallback preserves id order', () => {
      const collections: CollectionInput[] = [
        { id: 'first', photoCount: 5 },
        { id: 'second', photoCount: 5 },
        { id: 'third', photoCount: 5 },
      ]
      const result = computeCircleOffsets(collections, 100, 100)
      expect(result.map(r => r.id)).toEqual(['first', 'second', 'third'])
    })
  })
})
