import { Link } from 'react-router-dom'
import { collections } from '../content/collections'
import { photos } from '../content/photos'
import type { Photo } from '../types/photos'

function PhotoThumbnail({ photo }: { photo: Photo }) {
  return (
    <Link to={`/${photo.slug}`} className="photo-thumb">
      <img src={photo.displaySrc} alt="" loading="lazy" />
    </Link>
  )
}

export default function GalleryPage() {
  return (
    <main className="gallery-page">
      {collections.map(collection => {
        const sectionPhotos = photos.filter(p => p.collections[0] === collection.id)
        if (sectionPhotos.length === 0) return null
        return (
          <section
            key={collection.id}
            className="gallery-section"
            style={{ ['--section-color' as string]: collection.color } as React.CSSProperties}
          >
            <h2
              className="gallery-section-header"
              style={{ color: collection.color }}
            >
              {'[ '}{collection.name}{' ]'}
            </h2>
            <div className="photo-grid">
              {sectionPhotos.map(photo => (
                <PhotoThumbnail key={photo.slug} photo={photo} />
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
