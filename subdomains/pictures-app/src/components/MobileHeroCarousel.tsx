import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import { usePhotoData } from '../content/photoData'
import { slideIndexForSlug, slugForSlideIndex } from '../utils/lightboxNav'

type Props = {
  currentSlug: string
  /**
   * Fires LIVE with the in-frame photo's slug as the user swipes — wired to
   * Embla's `select` event, which fires mid-drag the moment the targeted snap
   * crosses threshold. Lets the filmstrip highlight track the swipe in real
   * time, decoupled from the (settle-committed) route.
   */
  onActiveChange?: (slug: string) => void
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
export default function MobileHeroCarousel({ currentSlug, onActiveChange }: Props) {
  const { photos } = usePhotoData()
  const orderedSlugs = useMemo(() => photos.map(p => p.slug), [photos])
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

  // On select (fires mid-drag once the targeted snap crosses threshold), report
  // the in-frame slug LIVE so the filmstrip highlight can track the swipe. This
  // never touches the route, so it can't yank the carousel position mid-drag.
  useEffect(() => {
    if (!emblaApi || !onActiveChange) return
    function onSelect() {
      const slug = slugForSlideIndex(orderedSlugs, emblaApi!.selectedScrollSnap())
      if (slug) onActiveChange!(slug)
    }
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onActiveChange, orderedSlugs])

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
  }, [emblaApi, currentSlug, navigate, orderedSlugs])

  return (
    <div className="mobile-hero-carousel" ref={emblaRef}>
      <div className="mobile-hero-track">
        {photos.map(photo => (
          <div
            key={photo.slug}
            className="mobile-hero-slide"
            data-active={photo.slug === currentSlug ? 'true' : undefined}
          >
            <div
              className="mobile-hero-slide-backdrop"
              style={{ backgroundImage: `url(${photo.displaySrc})` }}
              aria-hidden="true"
            />
            <img src={photo.displaySrc} alt={photo.slug} />
          </div>
        ))}
      </div>
    </div>
  )
}
