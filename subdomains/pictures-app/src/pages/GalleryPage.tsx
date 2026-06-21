import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePhotoData } from '../content/photoData'
import type { SizeHint } from '../types/photos'
import BinPackGrid, { type DevOptions } from '../components/BinPackGrid'
import { assignPhotosToSections } from '../utils/sections'
import { orderBySlugList } from '../utils/orderReconcile'
import { resolveDevMode, toggleDevMode } from '../utils/devMode'
import { slugFromHash } from '../utils/galleryAnchor'

const MOBILE_COLUMNS = 4
const MOBILE_AREAS: Record<SizeHint, number> = { small: 1, medium: 4, large: 6 }

export default function GalleryPage() {
  const location = useLocation()
  const { photos, collections, galleryOrder } = usePhotoData()

  // The gallery lays photos out in the curator's global order (photos.order.json),
  // independent of photos.ts's date-descending order for the detail filmstrip.
  const orderedForGallery = orderBySlugList(photos, galleryOrder)

  // Each photo appears once, in the section of its highest-precedence collection.
  const sections = assignPhotosToSections(collections, orderedForGallery, {
    dropEmpty: true,
  })

  const [devMode, setDevMode] = useState(() =>
    resolveDevMode(location.search, window.localStorage),
  )
  const [devOpts, setDevOpts] = useState<DevOptions>({
    showCellLines: true,
    showLabels: true,
    showStats: true,
    useFakeRatios: false,
  })

  // Re-resolve dev mode when the URL search string changes (e.g. ?dev=1 link).
  useEffect(() => {
    setDevMode(resolveDevMode(location.search, window.localStorage))
  }, [location.search])

  // Hash deep link (e.g. /#dsc03829): scroll that photo's tile to the top.
  // The grid positions tiles a tick after measuring its width and images load
  // lazily, so retry across a few frames until the visible tile appears (the
  // off-breakpoint grid is display:none, hence the getClientRects visibility
  // check picks the one actually on screen).
  useEffect(() => {
    const slug = slugFromHash(location.hash)
    if (!slug) return
    let cancelled = false
    let frames = 0
    const tryScroll = () => {
      if (cancelled) return
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-photo-slug="${CSS.escape(slug)}"]`,
        ),
      )
      const target = candidates.find(el => el.getClientRects().length > 0)
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'start' })
        return
      }
      if (frames++ < 30) requestAnimationFrame(tryScroll)
    }
    tryScroll()
    return () => {
      cancelled = true
    }
  }, [location.hash, photos])

  // Shift+D toggles the dev overlay live and persists the choice.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        setDevMode(toggleDevMode(window.localStorage))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <main className={`gallery-page${devMode ? ' gallery-page--dev' : ''}`}>
      {sections.map(({ collection, sectionPhotos }) => (
        <section
          key={collection.id}
          className="gallery-section"
          style={{ ['--section-color' as string]: collection.color } as React.CSSProperties}
        >
          {/* reserved for left-column text (defined later) */}
          <aside className="gallery-section-aside" aria-hidden="true" />

          <div className="gallery-section-main">
            <h2
              className="gallery-section-header"
              style={{ color: collection.color }}
            >
              {collection.name}
            </h2>
            <div className="gallery-grid-desktop">
              <BinPackGrid
                photos={sectionPhotos}
                dev={devMode ? devOpts : undefined}
              />
            </div>
            <div className="gallery-grid-mobile">
              <BinPackGrid
                photos={sectionPhotos}
                columns={MOBILE_COLUMNS}
                areas={MOBILE_AREAS}
                dev={devMode ? devOpts : undefined}
              />
            </div>
          </div>
        </section>
      ))}

      {devMode && (
        <div className="dev-overlay-panel" data-testid="dev-overlay-panel">
          <div className="dev-overlay-title">dev mode · shift+D</div>
          <label>
            <input
              type="checkbox"
              checked={devOpts.useFakeRatios}
              onChange={e => setDevOpts(o => ({ ...o, useFakeRatios: e.target.checked }))}
            />
            fake (sizeHint) ratios
          </label>
          <label>
            <input
              type="checkbox"
              checked={devOpts.showCellLines}
              onChange={e => setDevOpts(o => ({ ...o, showCellLines: e.target.checked }))}
            />
            cell lines
          </label>
          <label>
            <input
              type="checkbox"
              checked={devOpts.showLabels}
              onChange={e => setDevOpts(o => ({ ...o, showLabels: e.target.checked }))}
            />
            tile labels
          </label>
          <label>
            <input
              type="checkbox"
              checked={devOpts.showStats}
              onChange={e => setDevOpts(o => ({ ...o, showStats: e.target.checked }))}
            />
            packing stats
          </label>
        </div>
      )}
    </main>
  )
}
