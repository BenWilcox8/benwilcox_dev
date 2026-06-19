import { describe, it, expect } from 'vitest'
import { placePhotos, computeCellSpan, GRID_COLUMNS } from './gridLayout'

describe('computeCellSpan', () => {
  it('returns colSpan within grid column bounds', () => {
    const span = computeCellSpan(1.5, 'medium')
    expect(span.colSpan).toBeGreaterThanOrEqual(1)
    expect(span.colSpan).toBeLessThanOrEqual(GRID_COLUMNS)
    expect(span.rowSpan).toBeGreaterThanOrEqual(1)
  })

  it('gives a wider colSpan for landscape photos than portrait at the same size', () => {
    const landscape = computeCellSpan(2, 'medium')
    const portrait = computeCellSpan(0.5, 'medium')
    expect(landscape.colSpan).toBeGreaterThan(portrait.colSpan)
  })
})

describe('placePhotos', () => {
  it('returns a placement for every photo', () => {
    const photos = [
      { slug: 'a', aspectRatio: 1.5, sizeHint: 'small' as const },
      { slug: 'b', aspectRatio: 1, sizeHint: 'medium' as const },
      { slug: 'c', aspectRatio: 0.75, sizeHint: 'large' as const },
    ]
    const placed = placePhotos(photos)
    expect(placed).toHaveLength(3)
    expect(placed.map(p => p.slug)).toEqual(['a', 'b', 'c'])
  })

  it('never places two photos in the same cell', () => {
    const photos = Array.from({ length: 10 }, (_, i) => ({
      slug: `photo-${i}`,
      aspectRatio: 1,
      sizeHint: 'small' as const,
    }))
    const placed = placePhotos(photos)
    const cells = new Set<string>()
    for (const p of placed) {
      for (let r = p.row; r < p.row + p.rowSpan; r++) {
        for (let c = p.col; c < p.col + p.colSpan; c++) {
          const key = `${c},${r}`
          expect(cells.has(key)).toBe(false)
          cells.add(key)
        }
      }
    }
  })

  it('all placed photos fit within the grid column count', () => {
    const photos = Array.from({ length: 5 }, (_, i) => ({
      slug: `photo-${i}`,
      aspectRatio: 1.5,
      sizeHint: 'medium' as const,
    }))
    const placed = placePhotos(photos)
    for (const p of placed) {
      expect(p.col).toBeGreaterThanOrEqual(0)
      expect(p.col + p.colSpan).toBeLessThanOrEqual(GRID_COLUMNS)
    }
  })
})
