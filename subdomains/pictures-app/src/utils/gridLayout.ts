import type { SizeHint } from '../types/photos'

export const GRID_COLUMNS = 10
export const ROW_HEIGHT_PX = 120
export const GUTTER_PX = 8
export const LOOKBACK_ROWS = 6

// Size is an AREA MULTIPLIER in grid cells; the real aspect ratio is
// authoritative for tile shape. Ideal dims w=sqrt(area*ar), h=sqrt(area/ar)
// are rounded INDEPENDENTLY to the nearest cell (min 1), so the tile's
// colSpan:rowSpan approximates the true ratio and the image center-crops the
// snap mismatch (object-fit: cover). A 3:2 landscape and a 2:3 portrait of the
// same size therefore occupy mirrored, roughly-equal spans.
const SIZE_AREA: Record<SizeHint, number> = {
  small: 4,
  medium: 9,
  large: 20,
}

export type CellSpan = { colSpan: number; rowSpan: number }
export type PlacedPhoto = { slug: string; col: number; row: number; colSpan: number; rowSpan: number }

export function computeCellSpan(aspectRatio: number, sizeHint: SizeHint): CellSpan {
  const area = SIZE_AREA[sizeHint]
  const colSpan = Math.max(1, Math.min(Math.round(Math.sqrt(area * aspectRatio)), GRID_COLUMNS))
  const rowSpan = Math.max(1, Math.round(Math.sqrt(area / aspectRatio)))
  return { colSpan, rowSpan }
}

export type PackingStats = {
  usedCells: number
  totalCells: number
  emptyCells: number
  wastedPct: number
}

/**
 * Packing efficiency of a placement set: cells covered by tiles vs. the total
 * cells in the grid's bounding box (GRID_COLUMNS wide × the deepest row). Used
 * by the dev overlay to judge how tightly the mosaic packs.
 */
export function computePackingStats(placed: PlacedPhoto[]): PackingStats {
  if (placed.length === 0) {
    return { usedCells: 0, totalCells: 0, emptyCells: 0, wastedPct: 0 }
  }
  const usedCells = placed.reduce((sum, p) => sum + p.colSpan * p.rowSpan, 0)
  const maxRow = placed.reduce((m, p) => Math.max(m, p.row + p.rowSpan), 0)
  const totalCells = GRID_COLUMNS * maxRow
  const emptyCells = Math.max(0, totalCells - usedCells)
  const wastedPct = totalCells === 0 ? 0 : Math.round((emptyCells / totalCells) * 100)
  return { usedCells, totalCells, emptyCells, wastedPct }
}

function rectFits(
  occupied: Set<string>,
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): boolean {
  if (col + colSpan > GRID_COLUMNS) return false
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      if (occupied.has(`${c},${r}`)) return false
    }
  }
  return true
}

function markOccupied(
  occupied: Set<string>,
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): void {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      occupied.add(`${c},${r}`)
    }
  }
}

export function placePhotos(
  photos: Array<{ slug: string; aspectRatio: number; sizeHint: SizeHint }>,
): PlacedPhoto[] {
  const occupied = new Set<string>()
  let frontier = 0
  const result: PlacedPhoto[] = []

  for (const photo of photos) {
    const { colSpan, rowSpan } = computeCellSpan(photo.aspectRatio, photo.sizeHint)
    let placed = false

    // look-back pass
    const lookbackStart = Math.max(0, frontier - LOOKBACK_ROWS)
    outer: for (let r = lookbackStart; r <= frontier; r++) {
      for (let c = 0; c <= GRID_COLUMNS - colSpan; c++) {
        if (rectFits(occupied, c, r, colSpan, rowSpan)) {
          markOccupied(occupied, c, r, colSpan, rowSpan)
          frontier = Math.max(frontier, r + rowSpan - 1)
          result.push({ slug: photo.slug, col: c, row: r, colSpan, rowSpan })
          placed = true
          break outer
        }
      }
    }

    if (placed) continue

    // forward pass
    let r = frontier
    while (!placed) {
      for (let c = 0; c <= GRID_COLUMNS - colSpan; c++) {
        if (rectFits(occupied, c, r, colSpan, rowSpan)) {
          markOccupied(occupied, c, r, colSpan, rowSpan)
          frontier = Math.max(frontier, r + rowSpan - 1)
          result.push({ slug: photo.slug, col: c, row: r, colSpan, rowSpan })
          placed = true
          break
        }
      }
      if (!placed) r++
    }
  }

  return result
}
