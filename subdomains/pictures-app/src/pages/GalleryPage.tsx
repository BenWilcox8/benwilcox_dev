import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePhotoData } from '../content/photoData'
import type { SizeHint } from '../types/photos'
import BinPackGrid, { type DevOptions } from '../components/BinPackGrid'
import CollectionRail from '../components/CollectionRail'
import CollectionRailDrawer from '../components/CollectionRailDrawer'
import { useMediaQuery, MOBILE_MEDIA_QUERY } from '../hooks/useMediaQuery'
import { assignPhotosToSections } from '../utils/sections'
import { orderBySlugList } from '../utils/orderReconcile'
import { resolveDevMode, toggleDevMode } from '../utils/devMode'
import { slugFromHash } from '../utils/galleryAnchor'
import { isCollectionHash, idFromCollectionHash } from '../utils/collectionAnchor'
import { activeSection } from '../utils/activeSection'
import { scrollProgress } from '../utils/scrollProgress'
import { sectionFractions, type SectionFraction } from '../utils/sectionFractions'

const DESKTOP_COLUMNS = 9
const MOBILE_COLUMNS = 4
const MOBILE_AREAS: Record<SizeHint, number> = { small: 1, medium: 4, large: 6 }
/** Distance below the viewport top a section header must reach to count active. */
const ACTIVE_OFFSET = 64

export default function GalleryPage() {
  const location = useLocation()
  const { photos, collections, galleryOrder } = usePhotoData()
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY)

  // The gallery lays photos out in the curator's global order (photos.order.json),
  // independent of photos.ts's date-descending order for the detail filmstrip.
  const orderedForGallery = orderBySlugList(photos, galleryOrder)

  // Each photo appears once, in the section of its highest-precedence collection.
  const sections = assignPhotosToSections(collections, orderedForGallery, {
    dropEmpty: true,
  })

  // The collection currently in view, tracked by a rAF-throttled scroll handler
  // below and rendered as the filled circle on the nav rail. First section at
  // the top of the page (activeSection handles the above-first-section case).
  const [activeCollectionId, setActiveCollectionId] = useState<
    string | undefined
  >(sections[0]?.collection.id)

  // The user's scroll progress through the page (0→1), driving the rail's dot.
  const [scrollFraction, setScrollFraction] = useState(0)

  // Each section's rail position (0→1), measured from the rendered header
  // positions on the page (not photo counts), so circles line up with the dot.
  const [railFractions, setRailFractions] = useState<SectionFraction[]>([])

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

  // Collection-anchor deep link (e.g. /#collection-nature): scroll the
  // matching section header to the top instantly with no smooth behavior.
  useEffect(() => {
    if (!isCollectionHash(location.hash)) return
    const id = idFromCollectionHash(location.hash)
    if (!id) return
    const header = document.getElementById(`collection-${id}`)
    if (header && typeof header.scrollIntoView === 'function') {
      header.scrollIntoView({ block: 'start' })
    }
  }, [location.hash])

  // Hash deep link (e.g. /#dsc03829): scroll that photo's tile to the top.
  // The grid positions tiles a tick after measuring its width and images load
  // lazily, so retry across a few frames until the visible tile appears (the
  // off-breakpoint grid is display:none, hence the getClientRects visibility
  // check picks the one actually on screen).
  // Collection-prefixed hashes are handled by the effect above; ignore them here.
  useEffect(() => {
    if (isCollectionHash(location.hash)) return
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

  // rAF-throttled scroll-spy: read each rendered section header's position and
  // delegate to tested pure helpers — `activeSection` for which circle is filled
  // and `sectionFractions` for where each circle sits (from real header tops, not
  // photo counts). Only this thin getBoundingClientRect + rAF glue lives here. A
  // ResizeObserver re-measures when the page height changes (e.g. images load).
  const sectionIds = sections.map(s => s.collection.id).join(',')
  useEffect(() => {
    const ids = sectionIds ? sectionIds.split(',') : []
    if (ids.length === 0) return
    let frame = 0
    const update = () => {
      frame = 0
      const scrollY = window.scrollY
      const measured = ids
        .map(id => {
          const header = document.getElementById(`collection-${id}`)
          if (!header) return null
          const viewportTop = header.getBoundingClientRect().top
          return { id, viewportTop, docTop: viewportTop + scrollY }
        })
        .filter(
          (s): s is { id: string; viewportTop: number; docTop: number } =>
            s !== null,
        )
      const active = activeSection(
        measured.map(m => ({ id: m.id, top: m.viewportTop })),
        ACTIVE_OFFSET,
      )
      if (active) setActiveCollectionId(active)
      const doc = document.documentElement
      const maxScroll = doc.scrollHeight - doc.clientHeight
      setScrollFraction(
        scrollProgress(doc.scrollTop, doc.scrollHeight, doc.clientHeight),
      )
      setRailFractions(
        sectionFractions(
          measured.map(m => ({ id: m.id, top: m.docTop })),
          maxScroll,
          ACTIVE_OFFSET,
        ),
      )
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
    observer?.observe(document.documentElement)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer?.disconnect()
    }
  }, [sectionIds])

  return (
    <main className={`gallery-page${devMode ? ' gallery-page--dev' : ''}`}>
      {(() => {
        const railSections = sections.map(({ collection, sectionPhotos }) => ({
          collection,
          photoCount: sectionPhotos.length,
        }))
        // Desktop renders the fixed rail in the gutter; mobile (<=768px) renders
        // the hamburger + half-width drawer instead. Branching in JS off the same
        // breakpoint the stylesheet uses keeps only one rail mounted at a time.
        return isMobile ? (
          <CollectionRailDrawer
            sections={railSections}
            activeId={activeCollectionId}
            scrollFraction={scrollFraction}
            sectionFractions={railFractions}
          />
        ) : (
          <CollectionRail
            sections={railSections}
            activeId={activeCollectionId}
            scrollFraction={scrollFraction}
            sectionFractions={railFractions}
          />
        )
      })()}
      {sections.map(({ collection, sectionPhotos }) => (
        <section
          key={collection.id}
          className="gallery-section"
          style={{ ['--section-color' as string]: collection.color } as React.CSSProperties}
        >
          <div className="gallery-section-main">
            <h2
              id={`collection-${collection.id}`}
              className="gallery-section-header"
              style={{ color: collection.color }}
            >
              {collection.name}
            </h2>
            <div className="gallery-grid-desktop">
              <BinPackGrid
                photos={sectionPhotos}
                columns={DESKTOP_COLUMNS}
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
