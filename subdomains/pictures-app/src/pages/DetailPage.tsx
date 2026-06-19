import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { photos } from '../content/photos'
import { collections } from '../content/collections'
import Filmstrip from '../components/Filmstrip'
import { resolveAdjacentSlug } from '../utils/photoNav'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ]
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`
}

function formatEditKey(key: string): string {
  return key
    .replace(/2012$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
}

function formatEditValue(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/** Ordered list of slugs matching the filmstrip order (same as `photos` array). */
const orderedSlugs = photos.map(p => p.slug)

export default function DetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  /**
   * Seam for issue #15 (lightbox): set this to true when the lightbox is open
   * so the arrow-key handler is suppressed and the lightbox can use those keys.
   */
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Keep a stable ref to the current slug so the keydown handler closure
  // always sees the latest value without being re-registered on every render.
  const slugRef = useRef(slug)
  slugRef.current = slug

  const photo = photos.find(p => p.slug === slug)

  // Prefetch the immediate neighbors' displaySrc when the detail page opens.
  useEffect(() => {
    if (!slug) return
    const prevSlug = resolveAdjacentSlug(orderedSlugs, slug, 'left')
    const nextSlug = resolveAdjacentSlug(orderedSlugs, slug, 'right')

    for (const neighborSlug of [prevSlug, nextSlug]) {
      if (!neighborSlug) continue
      const neighbor = photos.find(p => p.slug === neighborSlug)
      if (neighbor?.displaySrc) {
        const img = new Image()
        img.src = neighbor.displaySrc
      }
    }
  }, [slug])

  // Arrow-key navigation: left/right move to the adjacent photo.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isLightboxOpen) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      const direction = e.key === 'ArrowLeft' ? 'left' : 'right'
      const currentSlug = slugRef.current
      if (!currentSlug) return

      const target = resolveAdjacentSlug(orderedSlugs, currentSlug, direction)
      if (target) {
        navigate(`/${target}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, isLightboxOpen])

  if (!photo) {
    return (
      <div className="detail-404">
        <p>photo not found</p>
        <Link to="/">← back to gallery</Link>
      </div>
    )
  }

  const photoCollections = photo.collections
    .map(id => collections.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  const hasEdits = photo.edits !== null
  const editEntries = hasEdits
    ? Object.entries(photo.edits as Record<string, number>).filter(([, v]) => v !== 0)
    : []

  return (
    <div className="detail-page">
      <div className="detail-content">
        <div className="detail-photo-zone">
          <img
            className="detail-photo detail-photo-clickable"
            src={photo.displaySrc}
            alt={photo.slug}
            onClick={() => setIsLightboxOpen(true)}
          />
        </div>

        {isLightboxOpen && (
          <Lightbox
            open={isLightboxOpen}
            close={() => setIsLightboxOpen(false)}
            slides={[{ src: photo.fullSrc }]}
            index={0}
            plugins={[Zoom]}
            carousel={{ finite: true }}
            render={{
              buttonPrev: () => null,
              buttonNext: () => null,
            }}
            className="detail-lightbox"
          />
        )}

        <div className="detail-sidebar">
          <Link to="/" className="detail-back">{'< back to gallery'}</Link>

          {(photo.date || photo.location) && (
            <div className="detail-meta-block">
              {photo.date && <div>{formatDate(photo.date)}</div>}
              {photo.location && <div>{photo.location.toLowerCase()}</div>}
            </div>
          )}

          {photoCollections.length > 0 && (
            <div className="detail-meta-block">
              <div className="detail-collection-tags">
                {photoCollections.map(col => (
                  <span
                    key={col.id}
                    className="detail-collection-tag"
                    style={{ borderLeftColor: col.color }}
                  >
                    {col.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(photo.title || photo.caption || photo.rating !== null) && (
            <div className="detail-meta-block">
              {photo.title && (
                <div className="detail-photo-title">{photo.title}</div>
              )}
              {photo.rating !== null && (
                <div className="detail-star-rating" aria-label={`${photo.rating} out of 5 stars`}>
                  {'★'.repeat(photo.rating)}{'☆'.repeat(5 - photo.rating)}
                </div>
              )}
              {photo.caption && (
                <div className="detail-photo-caption">{photo.caption}</div>
              )}
            </div>
          )}

          <div className="detail-meta-block">
            {photo.exif.aperture && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">aperture</span>
                <span>{photo.exif.aperture}</span>
              </div>
            )}
            {photo.exif.shutter && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">shutter</span>
                <span>{photo.exif.shutter}</span>
              </div>
            )}
            {photo.exif.iso !== null && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">iso</span>
                <span>{photo.exif.iso}</span>
              </div>
            )}
            {photo.exif.focalLength && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">focal</span>
                <span>{photo.exif.focalLength}</span>
              </div>
            )}
            {photo.exif.camera && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">camera</span>
                <span>{photo.exif.camera.toLowerCase()}</span>
              </div>
            )}
            {photo.exif.lens && (
              <div className="detail-meta-row">
                <span className="detail-meta-key">lens</span>
                <span>{photo.exif.lens.toLowerCase()}</span>
              </div>
            )}
          </div>

          <div className="detail-meta-block">
            <div className="detail-meta-section-label">lightroom edits</div>
            {!hasEdits ? (
              <div className="detail-meta-row">
                <span style={{ opacity: 0.65 }}>no edits applied</span>
              </div>
            ) : editEntries.length === 0 ? (
              <div className="detail-meta-row">
                <span style={{ opacity: 0.65 }}>no adjustments</span>
              </div>
            ) : (
              editEntries.map(([key, value]) => (
                <div className="detail-meta-row" key={key}>
                  <span className="detail-meta-key">{formatEditKey(key)}</span>
                  <span>{formatEditValue(value)}</span>
                </div>
              ))
            )}
          </div>

          <div className="detail-meta-block">
            {photo.rawUrl !== null ? (
              <a className="detail-download" href={photo.rawUrl} download>
                [ download raw ]
              </a>
            ) : (
              <a className="detail-download" href={photo.fullSrc} download>
                [ download jpg ]
              </a>
            )}
          </div>

        </div>
      </div>
      <Filmstrip currentSlug={slug!} />
    </div>
  )
}
