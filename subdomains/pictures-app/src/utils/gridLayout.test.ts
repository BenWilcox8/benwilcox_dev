import { describe, it, expect } from 'vitest'
import { placePhotos, computeCellSpan, computePackingStats, GRID_COLUMNS } from './gridLayout'

describe('computePackingStats', () => {
  it('reports a fully packed grid as zero empty cells', () => {
    // unit tiles filling a single row exactly (one per column)
    const placed = Array.from({ length: GRID_COLUMNS }, (_, c) => ({
      slug: `p${c}`, col: c, row: 0, colSpan: 1, rowSpan: 1,
    }))
    const stats = computePackingStats(placed)
    expect(stats.usedCells).toBe(GRID_COLUMNS)
    expect(stats.emptyCells).toBe(0)
    expect(stats.wastedPct).toBe(0)
  })

  it('counts holes left by an irregular layout', () => {
    // one 1x1 tile alone in a 1-row bounding box -> the rest of the row is empty
    const placed = [{ slug: 'a', col: 0, row: 0, colSpan: 1, rowSpan: 1 }]
    const stats = computePackingStats(placed)
    expect(stats.totalCells).toBe(GRID_COLUMNS) // bounding box is GRID_COLUMNS wide x 1 tall
    expect(stats.usedCells).toBe(1)
    expect(stats.emptyCells).toBe(GRID_COLUMNS - 1)
  })
})

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

describe('grid shape', () => {
  it('uses a 10-column desktop grid', () => {
    expect(GRID_COLUMNS).toBe(10)
  })

  it('shapes a standard 3:2 medium photo by area=9 sqrt+round (4x2)', () => {
    // w = round(sqrt(9*1.5)) = round(3.67) = 4; h = round(sqrt(9/1.5)) = round(2.45) = 2
    const span = computeCellSpan(1.5, 'medium')
    expect(span.colSpan).toBe(4)
    expect(span.rowSpan).toBe(2)
  })

  it('shapes a square medium photo as 3x3 (area=9)', () => {
    const span = computeCellSpan(1, 'medium')
    expect(span.colSpan).toBe(3)
    expect(span.rowSpan).toBe(3)
  })

  it('gives a 3:2 landscape and a 2:3 portrait of the same size roughly equal area', () => {
    const landscape = computeCellSpan(1.5, 'medium')
    const portrait = computeCellSpan(1 / 1.5, 'medium')
    const aL = landscape.colSpan * landscape.rowSpan
    const aP = portrait.colSpan * portrait.rowSpan
    expect(Math.abs(aL - aP)).toBeLessThanOrEqual(1)
    // spans mirror across orientation
    expect(portrait.colSpan).toBe(landscape.rowSpan)
    expect(portrait.rowSpan).toBe(landscape.colSpan)
  })

  it('clamps colSpan to the grid column count', () => {
    // an extreme-wide large photo would exceed the grid width before clamping
    const span = computeCellSpan(20, 'large')
    expect(span.colSpan).toBeLessThanOrEqual(GRID_COLUMNS)
  })

  it('never returns a span below 1 in either dimension', () => {
    const span = computeCellSpan(8, 'small')
    expect(span.colSpan).toBeGreaterThanOrEqual(1)
    expect(span.rowSpan).toBeGreaterThanOrEqual(1)
  })

  it('shapes a tile by its real ratio: landscape spans wider, portrait spans taller', () => {
    const landscape = computeCellSpan(2, 'medium')
    expect(landscape.colSpan).toBeGreaterThanOrEqual(landscape.rowSpan)

    const portrait = computeCellSpan(0.5, 'medium')
    expect(portrait.rowSpan).toBeGreaterThanOrEqual(portrait.colSpan)
  })

  it('gives a hero (large) tile more area than a small tile at the same ratio', () => {
    const large = computeCellSpan(1.5, 'large')
    const small = computeCellSpan(1.5, 'small')
    expect(large.colSpan * large.rowSpan).toBeGreaterThan(small.colSpan * small.rowSpan)
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
