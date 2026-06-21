import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Filmstrip from './Filmstrip'
import { fixturePhotoData } from '../test/fixturePhotoData'
import { PhotoDataProvider } from '../content/PhotoDataProvider'

const photos = fixturePhotoData.photos

function renderFilmstrip(props: { activeSlug: string; currentSlug: string }) {
  return render(
    <PhotoDataProvider value={fixturePhotoData}>
      {/* MemoryRouter starts on a DIFFERENT slug than activeSlug to prove the
          highlight follows the explicit activeSlug prop, not the URL. */}
      <MemoryRouter initialEntries={[`/${photos[0].slug}`]}>
        <Filmstrip activeSlug={props.activeSlug} currentSlug={props.currentSlug} />
      </MemoryRouter>
    </PhotoDataProvider>
  )
}

describe('Filmstrip', () => {
  it('highlights the slug it is told is active, independent of the URL', () => {
    // URL is photos[0], but we tell the filmstrip photos[2] is active.
    const target = photos[2]
    const { container } = renderFilmstrip({
      activeSlug: target.slug,
      currentSlug: photos[0].slug,
    })

    const active = container.querySelectorAll('.filmstrip-thumb-active')
    expect(active.length).toBe(1)
    const activeImg = active[0].querySelector('img') as HTMLImageElement
    expect(activeImg.src).toBe(target.thumbSrc)
  })

  it('marks only the active thumb, leaving the URL thumb unhighlighted when they differ', () => {
    const { container } = renderFilmstrip({
      activeSlug: photos[2].slug,
      currentSlug: photos[0].slug,
    })

    const urlThumb = container.querySelector(
      `a[href="/${photos[0].slug}"]`
    ) as HTMLElement
    expect(urlThumb.classList.contains('filmstrip-thumb-active')).toBe(false)
  })
})
