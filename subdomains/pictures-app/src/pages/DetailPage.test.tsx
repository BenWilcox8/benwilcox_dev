import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import DetailPage from './DetailPage'
import { PhotoDataProvider } from '../content/PhotoDataProvider'
import type { PhotoData } from '../content/photoData'
import type { Photo, Collection } from '../types/photos'

// Controlled, deterministic manifest data. These tests assert value-specific
// behaviour (raw vs. null rawUrl, title presence, collection tint), so they own
// their data rather than coupling to the auto-generated photos.ts fixture (whose
// slugs/fields change on every sync). URLs follow the modern clean-Storage form.
const BUCKET = 'https://storage.googleapis.com/benwilcoxdev.firebasestorage.app'
const ICELAND: Collection = { id: 'iceland', name: 'Iceland', color: '#a1cece' }

function makePhoto(over: Partial<Photo> & { slug: string }): Photo {
  const { slug } = over
  return {
    collections: ['iceland'],
    explicitSize: null,
    aspectRatio: 1.5,
    thumbSrc: `${BUCKET}/thumbs/${slug}.webp`,
    displaySrc: `${BUCKET}/display/${slug}.webp`,
    fullSrc: `${BUCKET}/photos/${slug}.jpg`,
    rawUrl: `${BUCKET}/raw/${slug}.arw`,
    date: '2026-06-15',
    location: null,
    title: null,
    caption: null,
    rating: 4,
    exif: {
      aperture: 'f/5',
      shutter: '1/640s',
      iso: 5000,
      focalLength: '50mm',
      camera: 'SONY ILCE-6400',
      lens: 'E 50mm F1.8',
    },
    edits: { Contrast2012: 10 },
    ...over,
  }
}

// Two chronological photos; photo-a is first (index 0), photo-b second.
const PHOTO_A = makePhoto({ slug: 'photo-a' })
const PHOTO_B = makePhoto({ slug: 'photo-b' })
const DATA: PhotoData = {
  photos: [PHOTO_A, PHOTO_B],
  collections: [ICELAND],
  galleryOrder: ['photo-a', 'photo-b'],
}

/** The clickable desktop hero img (distinct from the mobile carousel slides). */
function desktopHero(): HTMLImageElement {
  return document.querySelector('.detail-photo-desktop') as HTMLImageElement
}

/**
 * Force the `(max-width: 768px)` media query to a fixed result and return a
 * handle to flip it (firing change listeners) to simulate a viewport resize.
 */
function installMatchMedia(initialMobile: boolean) {
  let mobile = initialMobile
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const matchMedia = vi.fn((query: string) => {
    const isMobileQuery = query.includes('max-width: 768px')
    return {
      get matches() {
        return isMobileQuery ? mobile : false
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        if (isMobileQuery) listeners.add(cb)
      },
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.delete(cb)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  })
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia
  return {
    setMobile(next: boolean) {
      mobile = next
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent)
    },
  }
}

function renderDetailPage(slug: string, data: PhotoData = DATA) {
  return render(
    <PhotoDataProvider value={data}>
      <MemoryRouter initialEntries={[`/${slug}`]}>
        <Routes>
          <Route path="/:slug" element={<DetailPage />} />
        </Routes>
      </MemoryRouter>
    </PhotoDataProvider>
  )
}

describe('DetailPage download buttons', () => {
  it('shows both raw and jpg download links when rawUrl is non-null', () => {
    renderDetailPage(PHOTO_A.slug)

    const rawLink = screen.getByRole('link', { name: '[ download raw ]' })
    expect(rawLink.getAttribute('href')).toBe(PHOTO_A.rawUrl)
    expect(rawLink.hasAttribute('download')).toBe(true)

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    expect(jpgLink.getAttribute('href')).toBe(PHOTO_A.fullSrc)
    expect(jpgLink.hasAttribute('download')).toBe(true)
  })

  it('shows only jpg download link and no raw link when rawUrl is null', () => {
    const noRaw = makePhoto({ slug: 'no-raw', rawUrl: null })
    const data: PhotoData = { photos: [noRaw], collections: [ICELAND], galleryOrder: ['no-raw'] }
    renderDetailPage('no-raw', data)

    expect(screen.queryByRole('link', { name: '[ download raw ]' })).toBeNull()

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    expect(jpgLink.getAttribute('href')).toBe(noRaw.fullSrc)
    expect(jpgLink.hasAttribute('download')).toBe(true)
  })
})

describe('DetailPage sidebar order', () => {
  it('renders the download buttons above the exif and edits blocks', () => {
    renderDetailPage(PHOTO_A.slug)

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    const exifKey = screen.getByText('aperture')
    const editsLabel = screen.getByText('lightroom edits')

    // download must come before exif and before edits in document order
    expect(jpgLink.compareDocumentPosition(exifKey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(jpgLink.compareDocumentPosition(editsLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the title above the download buttons', () => {
    const titled = makePhoto({ slug: 'titled', title: 'Bench' })
    const data: PhotoData = { photos: [titled], collections: [ICELAND], galleryOrder: ['titled'] }
    renderDetailPage('titled', data)

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    const title = document.querySelector('.detail-photo-title')
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Bench')
    expect(title!.compareDocumentPosition(jpgLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('DetailPage sidebar tint', () => {
  it('sets the sidebar tint variable to the first collection color when the photo has a collection', () => {
    renderDetailPage(PHOTO_A.slug) // photo-a belongs to iceland (#a1cece)
    const sidebar = document.querySelector('.detail-sidebar') as HTMLElement
    expect(sidebar.style.getPropertyValue('--sidebar-tint')).toBe(ICELAND.color)
  })
})

describe('DetailPage capture date/time', () => {
  it('renders the full date and time when a dateTime is present', () => {
    const dated = makePhoto({ slug: 'dated', dateTime: '2026-06-19T19:35:00' })
    const data: PhotoData = { photos: [dated], collections: [ICELAND], galleryOrder: ['dated'] }
    renderDetailPage('dated', data)
    expect(screen.getByText('june 19, 2026')).toBeTruthy()
    expect(screen.getByText('7:35 pm')).toBeTruthy()
  })

  it('falls back to the full date with no time when only date is present', () => {
    renderDetailPage(PHOTO_A.slug) // date '2026-06-15', no dateTime
    expect(screen.getByText('june 15, 2026')).toBeTruthy()
    expect(screen.queryByText(/[ap]m$/)).toBeNull()
  })
})

describe('DetailPage back to gallery', () => {
  it('links the back control to the current photo anchor in the gallery', () => {
    renderDetailPage(PHOTO_A.slug)
    const back = screen.getByRole('link', { name: '< back to gallery' })
    expect(back.getAttribute('href')).toBe(`/#${PHOTO_A.slug}`)
  })
})

describe('DetailPage Escape key', () => {
  function renderWithLocation(slug: string) {
    let pathname: string | undefined
    function LocationProbe() {
      pathname = useLocation().pathname
      return null
    }
    render(
      <PhotoDataProvider value={DATA}>
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/" element={<LocationProbe />} />
            <Route path="/:slug" element={<DetailPage />} />
          </Routes>
        </MemoryRouter>
      </PhotoDataProvider>
    )
    return () => pathname
  }

  it('navigates to the current photo anchor in the gallery when Escape is pressed', () => {
    let pathname: string | undefined
    let hash: string | undefined
    function LocationProbe() {
      const loc = useLocation()
      pathname = loc.pathname
      hash = loc.hash
      return null
    }
    render(
      <PhotoDataProvider value={DATA}>
        <MemoryRouter initialEntries={[`/${PHOTO_A.slug}`]}>
          <Routes>
            <Route path="/" element={<LocationProbe />} />
            <Route path="/:slug" element={<DetailPage />} />
          </Routes>
        </MemoryRouter>
      </PhotoDataProvider>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(pathname).toBe('/')
    expect(hash).toBe(`#${PHOTO_A.slug}`)
  })

  it('closes the lightbox and does NOT navigate when Escape is pressed while the lightbox is open', () => {
    const getLocation = renderWithLocation(PHOTO_A.slug)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)
    expect(document.querySelector('.yarl__root')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })

    // still on the detail page (no navigation to gallery)
    expect(getLocation()).not.toBe('/')
  })
})

describe('DetailPage lightbox', () => {
  it('lightbox is NOT open initially', () => {
    renderDetailPage(PHOTO_A.slug)
    // YARL renders a root container with class yarl__root when open; should not be present initially
    expect(document.querySelector('.yarl__root')).toBeNull()
  })

  it('clicking the hero image opens the lightbox showing the full-res src', () => {
    renderDetailPage(PHOTO_A.slug)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // YARL renders the lightbox portal; assert it now appears in the DOM
    expect(document.querySelector('.yarl__root')).not.toBeNull()

    // The full-res src (the .jpg, distinct from the .webp display derivative)
    // is present somewhere in the lightbox markup.
    const allImgs = document.querySelectorAll('img')
    const fullResImg = Array.from(allImgs).find(img => img.src === PHOTO_A.fullSrc)
    expect(fullResImg).not.toBeUndefined()
  })

  it('lightbox HAS native prev/next carousel navigation (carousel over all photos)', () => {
    renderDetailPage(PHOTO_A.slug)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // Re-enabled native carousel nav buttons should now exist.
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeNull()
  })

  it('opens the lightbox at the index of the current photo, not index 0', () => {
    renderDetailPage(PHOTO_B.slug) // photo-b is the 2nd photo (index 1)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // The lightbox opens on this photo's slide, so the Previous button — only
    // disabled on slide 0 of a finite carousel — should be enabled.
    const prevBtn = screen.queryByRole('button', { name: /previous/i }) as HTMLButtonElement | null
    expect(prevBtn).not.toBeNull()
    expect(prevBtn!.disabled).toBe(false)
  })
})

describe('DetailPage single hero per breakpoint', () => {
  const originalMatchMedia = window.matchMedia
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('renders only the static desktop hero (no carousel) when the desktop layout is active', () => {
    installMatchMedia(false)
    renderDetailPage(PHOTO_A.slug)

    expect(document.querySelector('.detail-photo-desktop')).not.toBeNull()
    expect(document.querySelector('.mobile-hero-carousel')).toBeNull()
  })

  it('renders only the swipe carousel (no static desktop hero) when the mobile layout is active', () => {
    installMatchMedia(true)
    renderDetailPage(PHOTO_A.slug)

    expect(document.querySelector('.mobile-hero-carousel')).not.toBeNull()
    expect(document.querySelector('.detail-photo-desktop')).toBeNull()
  })

  it('keeps the carousel framed on the URL photo after a web -> mobile resize (no jump to most-recent)', () => {
    const stub = installMatchMedia(false)
    // Start on photo-a (index 0) in the desktop layout.
    renderDetailPage(PHOTO_A.slug)
    expect(document.querySelector('.mobile-hero-carousel')).toBeNull()

    // Flip to mobile: the carousel now mounts, fresh, at the URL's photo.
    act(() => stub.setMobile(true))

    const carousel = document.querySelector('.mobile-hero-carousel')
    expect(carousel).not.toBeNull()
    const activeSlide = carousel!.querySelector('[data-active="true"] img') as HTMLImageElement
    expect(activeSlide).not.toBeNull()
    expect(activeSlide.alt).toBe(PHOTO_A.slug)
  })
})

describe('DetailPage filmstrip active slug', () => {
  /** The filmstrip thumb currently flagged active (highlighted). */
  function activeFilmstripHref(): string | null {
    const active = document.querySelector(
      '.filmstrip .filmstrip-thumb-active'
    ) as HTMLAnchorElement | null
    return active?.getAttribute('href') ?? null
  }

  it('highlights the route photo in the filmstrip on initial load', () => {
    renderDetailPage(PHOTO_B.slug)
    expect(activeFilmstripHref()).toBe(`/${PHOTO_B.slug}`)
  })

  it('re-syncs the highlighted filmstrip thumb when the route changes (filmstrip tap / arrow keys)', () => {
    renderDetailPage(PHOTO_A.slug)
    expect(activeFilmstripHref()).toBe(`/${PHOTO_A.slug}`)

    // Arrow-key nav advances the route; activeSlug must follow it.
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(activeFilmstripHref()).toBe(`/${PHOTO_B.slug}`)
  })
})
