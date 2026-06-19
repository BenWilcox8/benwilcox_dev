import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DetailPage from './DetailPage'

// The first photo in the photos array
const TEST_SLUG = 'dsc02689'
const FULL_SRC = '/photos/DSC02689.jpg'

function renderDetailPage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DetailPage lightbox', () => {
  it('lightbox is NOT open initially', () => {
    renderDetailPage(TEST_SLUG)
    // YARL renders a root container with class yarl__root when open; should not be present initially
    expect(document.querySelector('.yarl__root')).toBeNull()
  })

  it('clicking the hero image opens the lightbox showing the full-res src', () => {
    renderDetailPage(TEST_SLUG)

    const heroImg = screen.getByRole('img', { name: TEST_SLUG })
    fireEvent.click(heroImg)

    // YARL renders the lightbox portal; assert it now appears in the DOM
    const lightboxContainer = document.querySelector('.yarl__root')
    expect(lightboxContainer).not.toBeNull()

    // Assert the full-res src is present somewhere in the lightbox markup
    const allImgs = document.querySelectorAll('img')
    const fullResImg = Array.from(allImgs).find(img => img.src.includes(FULL_SRC.replace('/photos/', '')))
    expect(fullResImg).not.toBeUndefined()
  })

  it('lightbox has no prev/next navigation buttons', () => {
    renderDetailPage(TEST_SLUG)

    const heroImg = screen.getByRole('img', { name: TEST_SLUG })
    fireEvent.click(heroImg)

    // YARL default nav buttons have aria-label "Previous" / "Next" — these should not exist
    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull()
  })
})
