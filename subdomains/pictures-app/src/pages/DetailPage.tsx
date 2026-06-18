import { useParams, Link } from 'react-router-dom'
import { photos } from '../content/photos'
import { collections } from '../content/collections'

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

export default function DetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const photo = photos.find(p => p.slug === slug)

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
            className="detail-photo"
            src={photo.displaySrc}
            alt={photo.slug}
          />
        </div>

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
              <a className="detail-download" href={photo.displaySrc} download>
                [ download jpg ]
              </a>
            )}
          </div>

          {/* filmstrip placeholder — issue #7 will render the strip here */}
        </div>
      </div>
    </div>
  )
}
