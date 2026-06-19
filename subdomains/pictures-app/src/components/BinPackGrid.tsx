import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Photo, SizeHint } from '../types/photos'
import {
  GRID_COLUMNS,
  GUTTER_PX,
  ROW_HEIGHT_PX,
  placePhotos,
} from '../utils/gridLayout'

type Props = {
  photos: Photo[]
}

const ASPECT_RATIO: Record<SizeHint, number> = {
  large: 1.78,
  medium: 1.5,
  small: 0.67,
}

export default function BinPackGrid({ photos }: Props) {
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

  const placements = placePhotos(
    photos.map(p => ({
      slug: p.slug,
      aspectRatio: ASPECT_RATIO[p.sizeHint],
      sizeHint: p.sizeHint,
    })),
  )

  const maxRow = placements.reduce((m, p) => Math.max(m, p.row + p.rowSpan - 1), 0)
  const totalHeight = (maxRow + 1) * (ROW_HEIGHT_PX + GUTTER_PX)

  const photoBySlug = new Map(photos.map(p => [p.slug, p]))

  return (
    <div ref={containerRef} className="bin-pack-grid" style={{ height: containerWidth === 0 ? 0 : totalHeight }}>
      {containerWidth > 0 &&
        placements.map(p => {
          const photo = photoBySlug.get(p.slug)
          if (!photo) return null
          const left = p.col * (cellWidth + GUTTER_PX)
          const top = p.row * (ROW_HEIGHT_PX + GUTTER_PX)
          const width = p.colSpan * cellWidth + (p.colSpan - 1) * GUTTER_PX
          const height = p.rowSpan * ROW_HEIGHT_PX + (p.rowSpan - 1) * GUTTER_PX
          return (
            <Link
              key={photo.slug}
              to={`/${photo.slug}`}
              style={{ left, top, width, height }}
            >
              <img src={photo.thumbSrc} alt="" loading="lazy" />
            </Link>
          )
        })}
    </div>
  )
}
