import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import { photos } from '../content/photos'
import { slideIndexForSlug, slugForSlideIndex } from '../utils/lightboxNav'

const orderedSlugs = photos.map(p => p.slug)

type Props = {
  currentSlug: string
}

/**
 * Finger-tracked, snapping swipe carousel for the detail hero on mobile.
 *
 * Slides traverse the same chronological order as the lightbox and arrow keys
 * (the `photos` array order), finite at the ends (no loop). On settle, the app
 * route is synced to the landed photo's slug. Drag feel is validated via HITL
 * on a device; the slide-index<->slug route-sync decision is the tested seam
 * (see lightboxNav).
 */
export default function MobileHeroCarousel({ currentSlug }: Props) {
  const navigate = useNavigate()
  const startIndex = slideIndexForSlug(orderedSlugs, currentSlug)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex,
    align: 'center',
  })

  // Keep the carousel positioned on the current photo when the route changes
  // by means other than a swipe (filmstrip tap, arrow keys, lightbox).
  useEffect(() => {
    if (!emblaApi) return
    if (emblaApi.selectedScrollSnap() !== startIndex) {
      emblaApi.scrollTo(startIndex, true)
    }
  }, [emblaApi, startIndex])

  // On settle, sync the route to the landed slug (finite — clamped indices).
  useEffect(() => {
    if (!emblaApi) return
    function onSettle() {
      const landed = emblaApi!.selectedScrollSnap()
      const slug = slugForSlideIndex(orderedSlugs, landed)
      if (slug && slug !== currentSlug) {
        navigate(`/${slug}`)
      }
    }
    emblaApi.on('settle', onSettle)
    return () => {
      emblaApi.off('settle', onSettle)
    }
  }, [emblaApi, currentSlug, navigate])

  return (
    <div className="mobile-hero-carousel" ref={emblaRef}>
      <div className="mobile-hero-track">
        {photos.map(photo => (
          <div
            key={photo.slug}
            className="mobile-hero-slide"
            data-active={photo.slug === currentSlug ? 'true' : undefined}
          >
            <img src={photo.displaySrc} alt={photo.slug} />
          </div>
        ))}
      </div>
    </div>
  )
}
