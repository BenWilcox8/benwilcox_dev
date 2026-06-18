import { Link } from 'react-router-dom'
import { collections } from '../content/collections'
import { photos } from '../content/photos'
import type { Photo } from '../types/photos'
import BinPackGrid from '../components/BinPackGrid'

function PhotoThumb({ photo }: { photo: Photo }) {
  return (
    <Link to={`/${photo.slug}`} className="photo-thumb">
      <img src={photo.displaySrc} alt="" loading="lazy" />
    </Link>
  )
}

export default function GalleryPage() {
  // Each photo appears once, in the section of its highest-precedence collection
  // (precedence = the order collections are listed in collections.ts).
  const shown = new Set<string>()
  const sections = collections.map(collection => {
    const sectionPhotos = photos.filter(
      p => !shown.has(p.slug) && p.collections.includes(collection.id),
    )
    sectionPhotos.forEach(p => shown.add(p.slug))
    return { collection, sectionPhotos }
  })

  return (
    <main className="gallery-page">
      {sections.map(({ collection, sectionPhotos }) => {
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
            <div className="gallery-grid-desktop">
              <BinPackGrid photos={sectionPhotos} />
            </div>
            <div className="gallery-grid-mobile">
              {sectionPhotos.map(photo => (
                <PhotoThumb key={photo.slug} photo={photo} />
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
