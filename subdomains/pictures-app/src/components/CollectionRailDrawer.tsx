import { useState } from 'react'
import CollectionRail, { type RailSection } from './CollectionRail'

type Props = {
  /** Same on-page sections the desktop rail consumes (dropEmpty, page order). */
  sections: RailSection[]
  /** The id of the collection currently in view; its circle is filled. */
  activeId?: string
}

/**
 * The mobile presentation of the collection-navigation rail (`<=768px`).
 *
 * A hamburger toggle is pinned to the viewport (top-left, `position: fixed`) so
 * it follows the user down the page and stays above the drawer while open. It
 * toggles a half-width `position: fixed` drawer — there is no scroll-lock and no
 * blocking scrim, so the right half keeps showing photos, the page stays
 * scrollable, and the active circle keeps updating live as you scroll.
 *
 * The drawer reuses the exact same {@link CollectionRail} content (line, circles,
 * labels, proportional positions, active fill) — no separate layout math, since
 * circle positions map by photo count rather than measured height.
 *
 * Tapping a collection navigates (`#collection-<id>`) but does NOT close the
 * drawer; it closes via the hamburger toggle or the small × control inside it.
 * Open/closed is local component state and is not persisted across reloads.
 */
export default function CollectionRailDrawer({ sections, activeId }: Props) {
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
        <button
          type="button"
          className="collection-rail-drawer-close"
          aria-label="close collections"
          onClick={() => setOpen(false)}
        >
          <span aria-hidden="true">×</span>
        </button>
        <CollectionRail sections={sections} activeId={activeId} variant="drawer" />
      </div>
    </>
  )
}
