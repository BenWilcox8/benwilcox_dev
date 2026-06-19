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
import { formatTileInfo } from '../utils/tileInfo'
import { shouldIdlePrefetch, readConnection } from '../utils/imageUpgrade'

/**
 * Progressive tile image: paints `thumbSrc` immediately, then upgrades to
 * `displaySrc`. In-view tiles upgrade first (IntersectionObserver); a later
 * idle pass upgrades any still on the thumbnail. The swap preloads + decodes
 * the display derivative, then fades it in (no layout shift). The idle prefetch
 * backs off on Save-Data / slow connections.
 */
function TileImage({ thumbSrc, displaySrc }: { thumbSrc: string; displaySrc: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState(thumbSrc)
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (src === displaySrc || !displaySrc) return

    function upgrade() {
      const img = new Image()
      img.src = displaySrc
      const swap = () => {
        if (cancelled) return
        setSrc(displaySrc)
        setUpgraded(true)
      }
      if (typeof img.decode === 'function') {
        img.decode().then(swap, swap)
      } else {
        img.onload = swap
        img.onerror = swap
      }
    }

    const el = ref.current
    let io: IntersectionObserver | null = null
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          io?.disconnect()
          upgrade()
        }
      })
      io.observe(el)
    }

    // Idle pass: upgrade tiles still on the thumbnail (off-screen ones), unless
    // the connection signals data-saver / slow.
    let idleId: number | null = null
    if (shouldIdlePrefetch(readConnection())) {
      const ric =
        typeof requestIdleCallback !== 'undefined'
          ? requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 200) as unknown as number
      idleId = ric(() => {
        if (!cancelled) upgrade()
      }) as unknown as number
    }

    return () => {
      cancelled = true
      io?.disconnect()
      if (idleId != null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId)
      } else if (idleId != null) {
        clearTimeout(idleId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySrc])

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      className={upgraded ? 'tile-img tile-img--upgraded' : 'tile-img'}
    />
  )
}

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
  // Square grid cells: a tile's colSpan/rowSpan approximates its real ratio,
  // and the image fills the tile with object-fit:cover (center-crop), trimming
  // the small snap mismatch evenly on the two shorter sides.
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
          const info = formatTileInfo(photo)
          return (
            <Link
              key={photo.slug}
              to={`/${photo.slug}`}
              style={{ left, top, width, height }}
            >
              <TileImage thumbSrc={photo.thumbSrc} displaySrc={photo.displaySrc} />
              {/* Always-on hover info card (suppressed on touch via CSS). */}
              <span className="bin-pack-tile-label tile-info-card" aria-hidden="true">
                {info.filename}
                <br />
                ar {info.aspectRatio} · {info.rating}
                <br />
                {info.aperture} · {info.shutter} · ISO {info.iso}
              </span>
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
