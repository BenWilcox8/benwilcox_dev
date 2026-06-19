import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { photos } from '../content/photos'
import { collections } from '../content/collections'

type Props = {
  currentSlug: string
}

export default function Filmstrip({ currentSlug }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    const active = container?.querySelector('[data-active="true"]') as HTMLElement | null
    if (active && container) {
      const containerCenter = container.offsetWidth / 2
      const thumbCenter = active.offsetLeft + active.offsetWidth / 2
      container.scrollLeft = thumbCenter - containerCenter
    }
  }, [currentSlug])

  return (
    <div className="filmstrip" ref={scrollRef}>
      {photos.map(photo => {
        const primaryCollectionId = photo.collections.find(id =>
          collections.some(c => c.id === id)
        )
        const collection = primaryCollectionId
          ? collections.find(c => c.id === primaryCollectionId)
          : undefined
        const collectionColor = collection?.color ?? 'transparent'
        const isActive = photo.slug === currentSlug

        return (
          <Link
            key={photo.slug}
            to={`/${photo.slug}`}
            className={`filmstrip-thumb${isActive ? ' filmstrip-thumb-active' : ''}`}
            style={{ '--thumb-color': collectionColor } as React.CSSProperties}
            data-active={isActive ? 'true' : undefined}
          >
            <img
              src={photo.thumbSrc}
              alt=""
              loading="lazy"
            />
          </Link>
        )
      })}
    </div>
  )
}
