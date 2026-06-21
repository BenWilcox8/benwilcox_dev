import { useState } from 'react'
import CollectionRail, { type RailSection } from './CollectionRail'
import type { SectionFraction } from '../utils/sectionFractions'

type Props = {
  /** Same on-page sections the desktop rail consumes (dropEmpty, page order). */
  sections: RailSection[]
  /** The id of the collection currently in view; its circle is filled. */
  activeId?: string
  /** Scroll progress through the page (0→1), forwarded to the rail's dot. */
  scrollFraction?: number
  /** Measured per-section rail positions (0→1), forwarded to the rail. */
  sectionFractions?: SectionFraction[]
}

/**
 * The mobile presentation of the collection-navigation rail (`<=768px`).
 *
 * A hamburger toggle sits top-left. Closed it is `position: sticky`: it rests
 * just below the header when scrolled to the top (never overlapping it) and pins
 * near the top of the viewport once scrolled down. Open it becomes viewport-fixed
 * in the drawer's top-right corner and doubles as the close control. It toggles a
 * half-width
 * `position: fixed` drawer — there is no scroll-lock and no blocking scrim, so
 * the right half keeps showing photos, the page stays scrollable, and the active
 * circle keeps updating live as you scroll.
 *
 * The drawer reuses the exact same {@link CollectionRail} content (line, circles,
 * labels, proportional positions, active fill) — no separate layout math, since
 * circle positions map by photo count rather than measured height.
 *
 * Tapping a collection navigates (`#collection-<id>`) but does NOT close the
 * drawer; it closes via the hamburger toggle. Open/closed is local component
 * state and is not persisted across reloads.
 */
export default function CollectionRailDrawer({
  sections,
  activeId,
  scrollFraction,
  sectionFractions,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`collection-rail-hamburger${
          open ? ' collection-rail-hamburger-open' : ''
        }`}
        aria-label={open ? 'close collections' : 'open collections'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div
        className={`collection-rail-drawer${
          open ? ' collection-rail-drawer-open' : ''
        }`}
        aria-hidden={!open}
      >
        <CollectionRail
          sections={sections}
          activeId={activeId}
          scrollFraction={scrollFraction}
          sectionFractions={sectionFractions}
          variant="drawer"
        />
      </div>
    </>
  )
}
