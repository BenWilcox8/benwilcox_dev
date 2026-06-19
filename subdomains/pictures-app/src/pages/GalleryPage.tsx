import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { collections } from '../content/collections'
import { photos } from '../content/photos'
import type { Photo } from '../types/photos'
import BinPackGrid, { type DevOptions } from '../components/BinPackGrid'
import { assignPhotosToSections } from '../utils/sections'
import { resolveDevMode, toggleDevMode } from '../utils/devMode'

function PhotoThumb({ photo }: { photo: Photo }) {
  return (
    <Link to={`/${photo.slug}`} className="photo-thumb">
      <img src={photo.thumbSrc} alt="" loading="lazy" />
    </Link>
  )
}

export default function GalleryPage() {
  const location = useLocation()

  // Each photo appears once, in the section of its highest-precedence collection.
  const sections = assignPhotosToSections(collections, photos, { dropEmpty: true })

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
              {sectionPhotos.map(photo => (
                <PhotoThumb key={photo.slug} photo={photo} />
              ))}
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
