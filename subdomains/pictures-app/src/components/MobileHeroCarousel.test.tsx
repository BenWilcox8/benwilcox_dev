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
    // First slide initially paints the thumbnail (progressive image pattern).
    expect((slides[0] as HTMLImageElement).src).toContain(photos[0].thumbSrc)
  })

  it('marks the current photo as the active slide', () => {
    const target = photos[2]
    const { container } = renderCarousel(target.slug)
    const active = container.querySelector('.mobile-hero-slide[data-active="true"] img') as HTMLImageElement
    expect(active).not.toBeNull()
    // Progressive image: foreground initially shows the thumbnail, not the display derivative.
    expect(active.src).toContain(target.thumbSrc)
  })

  it('renders one slide per photo', () => {
    const { container } = renderCarousel(photos[0].slug)
    const slides = container.querySelectorAll('.mobile-hero-slide')
    expect(slides.length).toBe(photos.length)
  })

  it('does NOT eagerly mount every slide backdrop (they are gated on intersection)', () => {
    // The expensive filter:blur backdrop is rendered per-slide only when a slide
    // is in/near view (see HeroSlide). With no slide reported as intersecting,
    // none should be mounted — this is what stops ~80 blur layers painting at
    // once and causing the per-slide lag spike. (Backdrop sourcing from thumbSrc
    // is covered in HeroSlide's own tests.)
    const { container } = renderCarousel(photos[0].slug)
    const backdrops = container.querySelectorAll('.mobile-hero-slide-backdrop')
    expect(backdrops.length).toBe(0)
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
