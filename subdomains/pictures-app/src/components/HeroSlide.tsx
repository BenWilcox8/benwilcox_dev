import { useEffect, useRef, useState } from 'react'

type Props = {
  slug: string
  thumbSrc: string
  displaySrc: string
  isActive: boolean
}

/**
 * Presentational slide for MobileHeroCarousel.
 *
 * The carousel mounts every photo's slide at once (Embla does not virtualise),
 * so doing per-slide work eagerly means ~80 full-res decodes and ~80
 * filter:blur(48px) backdrop layers all at mount — the source of the per-slide
 * lag spike. To avoid that, the expensive work is gated behind an
 * IntersectionObserver (mirroring the gallery's TileImage): nothing happens for
 * an off-screen slide. A generous rootMargin warms the immediate neighbours so
 * the work is done just ahead of the slide becoming visible during a swipe.
 *
 * Backdrop: sourced from the small thumbnail derivative (thumbSrc); the blur
 * destroys all detail so the ~400px thumb is visually identical and far cheaper.
 * Rendered only while the slide is in/near view, capping the number of live
 * blur layers to the few the user can actually see.
 *
 * Foreground image: progressive. Paints the thumbnail immediately (already
 * cached by the gallery/filmstrip), then upgrades to the display derivative
 * after an async decode — but only once the slide is in view. Once upgraded it
 * stays on the display src (no re-decode churn on subsequent swipes).
 */
export default function HeroSlide({ slug, thumbSrc, displaySrc, isActive }: Props) {
  const slideRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [src, setSrc] = useState(thumbSrc)
  const [upgraded, setUpgraded] = useState(false)

  // Track whether the slide is in/near the viewport. The horizontal rootMargin
  // pre-warms one viewport-width of neighbours on each side so a slide is ready
  // before a swipe brings it on screen.
  useEffect(() => {
    const el = slideRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => {
        const intersecting = entries.some(e => e.isIntersecting)
        setInView(intersecting)
      },
      { rootMargin: '0px 100%' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Upgrade thumb -> display only once the slide is in view, and only once.
  useEffect(() => {
    if (!inView || upgraded || !displaySrc || src === displaySrc) return
    let cancelled = false

    const img = new Image()
    img.src = displaySrc
    const swap = () => {
      if (cancelled) return
      setSrc(displaySrc)
      setUpgraded(true)
    }
    if (typeof img.decode === 'function') {
      img.decode().then(swap, swap)
    } else {
      img.onload = swap
      img.onerror = swap
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, displaySrc])

  return (
    <div
      ref={slideRef}
      className="mobile-hero-slide"
      data-active={isActive ? 'true' : undefined}
    >
      {inView && (
        <div
          className="mobile-hero-slide-backdrop"
          style={{ backgroundImage: `url(${thumbSrc})` }}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={slug}
        decoding="async"
        className={upgraded ? 'hero-img hero-img--upgraded' : 'hero-img'}
      />
    </div>
  )
}
