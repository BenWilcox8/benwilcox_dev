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
 * Backdrop: sourced from the small thumbnail derivative (thumbSrc). The blur
 * destroys all detail, so painting from the ~400 px thumb is visually
 * identical and far cheaper — the thumb is already decoded by the gallery/filmstrip.
 *
 * Foreground image: progressive. Paints the thumbnail immediately (cached),
 * then upgrades to the display derivative after an async decode, mirroring the
 * TileImage pattern used in BinPackGrid.
 */
export default function HeroSlide({ slug, thumbSrc, displaySrc, isActive }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState(thumbSrc)
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (src === displaySrc || !displaySrc) return

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
  }, [displaySrc])

  return (
    <div
      className="mobile-hero-slide"
      data-active={isActive ? 'true' : undefined}
    >
      <div
        className="mobile-hero-slide-backdrop"
        style={{ backgroundImage: `url(${thumbSrc})` }}
        aria-hidden="true"
      />
      <img
        ref={imgRef}
        src={src}
        alt={slug}
        className={upgraded ? 'hero-img hero-img--upgraded' : 'hero-img'}
      />
    </div>
  )
}
