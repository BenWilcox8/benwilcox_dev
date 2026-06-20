import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileHeroCarousel from './MobileHeroCarousel'
import { photos } from '../content/photos'
import { WithPhotoData } from '../test/fixtureProvider'

function renderCarousel(slug: string) {
  return render(
    <WithPhotoData>
      <MemoryRouter>
        <MobileHeroCarousel currentSlug={slug} />
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
})
