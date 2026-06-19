import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Photo } from '../types/photos'
import {
  GRID_COLUMNS,
  GUTTER_PX,
  computePackingStats,
  placePhotos,
} from '../utils/gridLayout'
import { ASPECT_RATIO } from '../utils/aspectRatio'
import { resolveSizeHint } from '../utils/sizeHint'

export type DevOptions = {
  showCellLines: boolean
  showLabels: boolean
  showStats: boolean
  useFakeRatios: boolean
}

type Props = {
  photos: Photo[]
  dev?: DevOptions
}

export default function BinPackGrid({ photos, dev }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cellWidth =
    containerWidth > 0
      ? (containerWidth - (GRID_COLUMNS - 1) * GUTTER_PX) / GRID_COLUMNS
      : 0
  // Square grid cells: a tile's colSpan/rowSpan already encodes its real ratio,
  // so a square unit cell renders that ratio without cropping the photo.
  const rowHeight = cellWidth

  const useFake = dev?.useFakeRatios ?? false
  // Effective tile size is resolved at display time: explicit override else rating.
  const sizeBySlug = new Map(
    photos.map(p => [p.slug, resolveSizeHint(p.explicitSize, p.rating)]),
  )
  const placements = placePhotos(
    photos.map(p => {
      const size = sizeBySlug.get(p.slug)!
      return {
        slug: p.slug,
        aspectRatio: useFake ? ASPECT_RATIO[size] : p.aspectRatio,
        sizeHint: size,
      }
    }),
  )

  const maxRow = placements.reduce((m, p) => Math.max(m, p.row + p.rowSpan - 1), 0)
  const totalHeight = (maxRow + 1) * (rowHeight + GUTTER_PX)

  const photoBySlug = new Map(photos.map(p => [p.slug, p]))
  const stats = dev?.showStats ? computePackingStats(placements) : null

  return (
    <div
      ref={containerRef}
      className={`bin-pack-grid${dev ? ' bin-pack-grid--dev' : ''}`}
      style={{ height: containerWidth === 0 ? 0 : totalHeight }}
    >
      {/* dev: column/row cell lattice the packer places into */}
      {dev?.showCellLines && containerWidth > 0 &&
        Array.from({ length: maxRow + 1 }).map((_, r) =>
          Array.from({ length: GRID_COLUMNS }).map((_, c) => (
            <div
              key={`cell-${c}-${r}`}
              className="bin-pack-cell-line"
              style={{
                left: c * (cellWidth + GUTTER_PX),
                top: r * (rowHeight + GUTTER_PX),
                width: cellWidth,
                height: rowHeight,
              }}
            />
          )),
        )}

      {containerWidth > 0 &&
        placements.map(p => {
          const photo = photoBySlug.get(p.slug)
          if (!photo) return null
          const left = p.col * (cellWidth + GUTTER_PX)
          const top = p.row * (rowHeight + GUTTER_PX)
          const width = p.colSpan * cellWidth + (p.colSpan - 1) * GUTTER_PX
          const height = p.rowSpan * rowHeight + (p.rowSpan - 1) * GUTTER_PX
          return (
            <Link
              key={photo.slug}
              to={`/${photo.slug}`}
              style={{ left, top, width, height }}
            >
              <img src={photo.thumbSrc} alt="" loading="lazy" />
              {dev?.showLabels && (
                <span className="bin-pack-tile-label">
                  {photo.slug}
                  <br />
                  ar {photo.aspectRatio.toFixed(2)} · {sizeBySlug.get(photo.slug)}
                  {photo.explicitSize ? ' (set)' : ` (${photo.rating ?? 0}★)`}
                  <br />
                  {p.colSpan}×{p.rowSpan}
                </span>
              )}
            </Link>
          )
        })}

      {stats && (
        <span className="bin-pack-stats-badge">
          {photos.length} photos · {stats.usedCells}/{stats.totalCells} cells · {stats.wastedPct}% empty
        </span>
      )}
    </div>
  )
}
