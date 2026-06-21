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
}

/** Minimum vertical gap (px) between adjacent circle centres on the rail. */
const MIN_GAP = 44
/** Fallback rail height used until the panel is measured (and in jsdom tests). */
const DEFAULT_RAIL_HEIGHT = 600

/**
 * The desktop collection-navigation rail. A purely presentational, page-level
 * `position: fixed` element living in the gallery's left `1fr` gutter: a white
 * connecting line on a dark, ~90%-opaque full-height panel, with one circle +
 * label per on-page collection positioned by photo-count proportion.
 *
 * All geometry (circle offsets) and active-state logic live in tested pure
 * helpers; this component only renders their results and forwards clicks to the
 * collection-anchor hash, which the gallery page's existing effect turns into an
 * instant jump.
 */
export default function CollectionRail({ sections, activeId }: Props) {
  const lineRef = useRef<HTMLDivElement>(null)
  const [railHeight, setRailHeight] = useState(DEFAULT_RAIL_HEIGHT)

  // Measure the connecting line's pixel height so circle offsets map across the
  // real rail. This is the only DOM measurement here; it does not affect which
  // circle is active (that comes from the parent's scroll-spy).
  useLayoutEffect(() => {
    const el = lineRef.current
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

  return (
    <nav className="collection-rail" aria-label="collections">
      <div className="collection-rail-panel" aria-hidden="true" />
      <div className="collection-rail-line" ref={lineRef} aria-hidden="true" />
      {sections.map(({ collection, photoCount }) => {
        const isActive = collection.id === activeId
        const offset = offsetById.get(collection.id) ?? 0
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
    </nav>
  )
}
