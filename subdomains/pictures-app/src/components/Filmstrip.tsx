import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePhotoData } from '../content/photoData'

type Props = {
  /**
   * The slug to highlight. Decoupled from the URL so the highlight can track the
   * photo currently in frame LIVE while the hero carousel is mid-swipe.
   */
  activeSlug: string
  /**
   * The committed/route slug, used purely as the recenter trigger: the active
   * thumbnail re-centers when the route settles, not continuously during a drag.
   */
  currentSlug: string
}

export default function Filmstrip({ activeSlug, currentSlug }: Props) {
  const { photos, collections } = usePhotoData()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Recenter on the COMMITTED route slug (recenter timing), not on the live
  // highlight — so a mid-drag highlight change never yanks the filmstrip scroll.
  useEffect(() => {
    const container = scrollRef.current
    const routed = container?.querySelector(
      `[data-slug="${currentSlug}"]`
    ) as HTMLElement | null
    if (routed && container) {
      const containerCenter = container.offsetWidth / 2
      const thumbCenter = routed.offsetLeft + routed.offsetWidth / 2
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
        const isActive = photo.slug === activeSlug

        return (
          <Link
            key={photo.slug}
            to={`/${photo.slug}`}
            className={`filmstrip-thumb${isActive ? ' filmstrip-thumb-active' : ''}`}
            style={{ '--thumb-color': collectionColor } as React.CSSProperties}
            data-slug={photo.slug}
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
