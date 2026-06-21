import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import MobileHeroCarousel from './MobileHeroCarousel'
import { photos } from '../content/photos'
import { WithPhotoData } from '../test/fixtureProvider'

// A controllable fake of embla-carousel-react. We can drive its `select` and
// `settle` events and dictate which snap index is "selected", so we can assert
// live (select) vs commit (settle) behaviour deterministically — real Embla
// reports snap 0 in jsdom because measured width is always 0.
type EmblaListener = () => void
const emblaState = {
  selectedIndex: 0,
  listeners: { select: new Set<EmblaListener>(), settle: new Set<EmblaListener>() },
  scrollTo: vi.fn(),
}
function fireEmbla(event: 'select' | 'settle') {
  for (const cb of emblaState.listeners[event]) cb()
}
const fakeApi = {
  selectedScrollSnap: () => emblaState.selectedIndex,
  scrollTo: (...args: unknown[]) => emblaState.scrollTo(...args),
  on: (event: 'select' | 'settle', cb: EmblaListener) => {
    emblaState.listeners[event].add(cb)
  },
  off: (event: 'select' | 'settle', cb: EmblaListener) => {
    emblaState.listeners[event].delete(cb)
  },
}

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), fakeApi],
}))

beforeEach(() => {
  emblaState.selectedIndex = 0
  emblaState.listeners.select.clear()
  emblaState.listeners.settle.clear()
  emblaState.scrollTo.mockClear()
})

function renderCarousel(slug: string, onActiveChange?: (slug: string) => void) {
  return render(
    <WithPhotoData>
      <MemoryRouter>
        <MobileHeroCarousel currentSlug={slug} onActiveChange={onActiveChange} />
      </MemoryRouter>
    </WithPhotoData>
  )
}

describe('MobileHeroCarousel', () => {
  it('renders one slide per photo in chronological order', () => {
    const { container } = renderCarousel(photos[0].slug)
    const slides = container.querySelectorAll('.mobile-hero-slide img')
    expect(slides.length).toBe(photos.length)
    // first slide is the first (newest) photo's display image
    expect((slides[0] as HTMLImageElement).src).toBe(photos[0].displaySrc)
  })

  it('marks the current photo as the active slide', () => {
    const target = photos[2]
    const { container } = renderCarousel(target.slug)
    const active = container.querySelector('.mobile-hero-slide[data-active="true"] img') as HTMLImageElement
    expect(active).not.toBeNull()
    expect(active.src).toBe(target.displaySrc)
  })

  it('bakes a per-slide backdrop reflecting each slide\'s own displaySrc, not the routed slug', () => {
    // Route to a single slug; backdrops must still derive from each slide's own
    // image (so they travel with the finger), never from the routed slug.
    const { container } = renderCarousel(photos[0].slug)
    const backdrops = container.querySelectorAll('.mobile-hero-slide .mobile-hero-slide-backdrop')
    expect(backdrops.length).toBe(photos.length)

    photos.forEach((photo, i) => {
      const bg = (backdrops[i] as HTMLElement).style.backgroundImage
      expect(bg).toContain(photo.displaySrc)
    })

    // Different slides must have different backdrops (not all pinned to one image)
    const first = (backdrops[0] as HTMLElement).style.backgroundImage
    const second = (backdrops[1] as HTMLElement).style.backgroundImage
    expect(first).not.toBe(second)
  })
})

describe('MobileHeroCarousel live active tracking', () => {
  it('reports the in-frame slug LIVE via onActiveChange on Embla select (mid-drag)', () => {
    const onActiveChange = vi.fn()
    renderCarousel(photos[0].slug, onActiveChange)

    // Drag crosses snap threshold to index 2; Embla fires `select` mid-drag.
    emblaState.selectedIndex = 2
    act(() => fireEmbla('select'))

    expect(onActiveChange).toHaveBeenCalledWith(photos[2].slug)
  })

  it('does NOT navigate on select (live highlight must not commit to the URL)', () => {
    let pathname = ''
    function Probe() {
      pathname = useLocation().pathname
      return null
    }
    render(
      <WithPhotoData>
        <MemoryRouter initialEntries={[`/${photos[0].slug}`]}>
          <Routes>
            <Route
              path="/:slug"
              element={
                <>
                  <MobileHeroCarousel currentSlug={photos[0].slug} onActiveChange={vi.fn()} />
                  <Probe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </WithPhotoData>
    )

    emblaState.selectedIndex = 2
    act(() => fireEmbla('select'))

    expect(pathname).toBe(`/${photos[0].slug}`)
  })

  it('commits the landed slug to the URL on Embla settle', () => {
    let pathname = ''
    function Probe() {
      pathname = useLocation().pathname
      return null
    }
    render(
      <WithPhotoData>
        <MemoryRouter initialEntries={[`/${photos[0].slug}`]}>
          <Routes>
            <Route
              path="/:slug"
              element={
                <>
                  <MobileHeroCarousel currentSlug={photos[0].slug} onActiveChange={vi.fn()} />
                  <Probe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </WithPhotoData>
    )

    emblaState.selectedIndex = 3
    act(() => fireEmbla('settle'))

    expect(pathname).toBe(`/${photos[3].slug}`)
  })
})
