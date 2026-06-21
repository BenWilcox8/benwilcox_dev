import { useLayoutEffect, useRef, useState } from 'react'
import type { Collection } from '../types/photos'
import { computeCircleOffsets } from '../utils/circleLayout'
import { collectionHashForId } from '../utils/collectionAnchor'

/** One on-page collection plus how many photos it holds on the page. */
export type RailSection = {
  collection: Collection
  photoCount: number
}

type Props = {
  /**
   * The on-page sections, in page order, with no empty collections. Driven by
   * the same `assignPhotosToSections(..., { dropEmpty: true })` the gallery maps
   * over, so the rail and the page never disagree about what's present.
   */
  sections: RailSection[]
  /** The id of the collection currently in view; its circle is filled. */
  activeId?: string
  /**
   * The user's vertical scroll progress through the page, 0 (top) → 1 (bottom).
   * Drives the small indicator dot that slides down the rail as the user scrolls.
   */
  scrollFraction?: number
  /**
   * Where this rail is rendered. The default `'fixed'` is the desktop rail
   * pinned in the left gutter; `'drawer'` is the same content rendered inside
   * the mobile drawer wrapper (which owns its own fixed positioning), so the
   * inner rail fills its host instead of pinning itself to the viewport.
   */
  variant?: 'fixed' | 'drawer'
}

/**
 * Minimum vertical gap (px) between adjacent circle centres on the rail. Zero:
 * circles sit at their raw proportional offsets so they stay in sync with the
 * scroll dot (which is positioned by the same proportion); any nudging would
 * pull a circle away from where the dot reads that section to be.
 */
const MIN_GAP = 0
/** Fallback rail height used until the track is measured (and in jsdom tests). */
const DEFAULT_RAIL_HEIGHT = 600

/**
 * The desktop collection-navigation rail. A purely presentational, page-level
 * `position: fixed` element living in the gallery's left `1fr` gutter: a solid
 * dark panel with one circle + label per on-page collection positioned by
 * photo-count proportion, connected by a line whose segments take the colour of
 * the collection above them, plus a small dot tracking the user's scroll.
 *
 * All geometry (circle offsets) and active-state logic live in tested pure
 * helpers; this component only renders their results and forwards clicks to the
 * collection-anchor hash, which the gallery page's existing effect turns into an
 * instant jump.
 */
export default function CollectionRail({
  sections,
  activeId,
  scrollFraction = 0,
  variant = 'fixed',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [railHeight, setRailHeight] = useState(DEFAULT_RAIL_HEIGHT)

  // Measure the track's pixel height so circle offsets (and the colored line
  // segments and the scroll dot) map across the real rail. This is the only DOM
  // measurement here; it does not affect which circle is active.
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) setRailHeight(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const offsets = computeCircleOffsets(
    sections.map(s => ({ id: s.collection.id, photoCount: s.photoCount })),
    railHeight,
    MIN_GAP,
  )
  const offsetById = new Map(offsets.map(o => [o.id, o.offset]))
  const orderedOffsets = sections.map(s => offsetById.get(s.collection.id) ?? 0)

  return (
    <nav
      className={`collection-rail${
        variant === 'drawer' ? ' collection-rail-in-drawer' : ''
      }`}
      aria-label="collections"
    >
      <div className="collection-rail-panel" aria-hidden="true" />
      {/* The track insets the line + circles within the panel so the first and
          last labels never spill past the panel's top/bottom edges. railHeight
          is the track's measured inner height. */}
      <div className="collection-rail-track" ref={trackRef}>
        {/* Connecting line, drawn as one segment per collection: each runs from
            its own circle down to the next collection's circle (the last to the
            track bottom) and takes that collection's colour. */}
        {sections.map(({ collection }, i) => {
          const top = orderedOffsets[i]
          const bottom =
            i < sections.length - 1 ? orderedOffsets[i + 1] : railHeight
          return (
            <div
              key={`segment-${collection.id}`}
              className="collection-rail-segment"
              style={{
                top: `${top}px`,
                height: `${Math.max(0, bottom - top)}px`,
                background: collection.color,
              }}
              aria-hidden="true"
            />
          )
        })}
        {/* Scroll-position indicator: above the line, below the section circles. */}
        <div
          className="collection-rail-progress"
          style={{ top: `${scrollFraction * railHeight}px` }}
          aria-hidden="true"
        />
        {sections.map(({ collection, photoCount }, i) => {
          const isActive = collection.id === activeId
          const offset = orderedOffsets[i]
          return (
            <div
              key={collection.id}
              className="collection-rail-entry"
              data-collection-id={collection.id}
              data-photo-count={photoCount}
              style={{ top: `${offset}px` }}
            >
              <a
                href={collectionHashForId(collection.id)}
                className="collection-rail-link"
                style={{ color: collection.color }}
              >
                <span
                  className={`collection-rail-circle${
                    isActive ? ' collection-rail-circle-active' : ''
                  }`}
                  style={{ color: collection.color }}
                  aria-hidden="true"
                />
                <span
                  className="collection-rail-label"
                  style={{ color: collection.color }}
                >
                  {collection.name}
                </span>
              </a>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
