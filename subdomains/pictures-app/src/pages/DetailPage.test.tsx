import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DetailPage from './DetailPage'

// The first photo in the photos array — has a non-null rawUrl (ARW)
const TEST_SLUG = 'dsc02689'
const FULL_SRC = '/photos/DSC02689.jpg'
const RAW_URL = 'https://firebasestorage.googleapis.com/v0/b/benwilcoxdev.firebasestorage.app/o/raw%2FDSC02689.ARW?alt=media&token=cc084336-db03-42b2-9923-92e932f8a0c4'

// JPEG-only capture: rawUrl is null in photos.ts
const NO_RAW_SLUG = 'dsc03276-2'
const NO_RAW_FULL_SRC = '/photos/DSC03276-2.jpg'

function renderDetailPage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DetailPage download buttons', () => {
  it('shows both raw and jpg download links when rawUrl is non-null', () => {
    renderDetailPage(TEST_SLUG)

    const rawLink = screen.getByRole('link', { name: '[ download raw ]' })
    expect(rawLink).toBeDefined()
    expect(rawLink.getAttribute('href')).toBe(RAW_URL)
    expect(rawLink.hasAttribute('download')).toBe(true)

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    expect(jpgLink).toBeDefined()
    expect(jpgLink.getAttribute('href')).toBe(FULL_SRC)
    expect(jpgLink.hasAttribute('download')).toBe(true)
  })

  it('shows only jpg download link and no raw link when rawUrl is null', () => {
    renderDetailPage(NO_RAW_SLUG)

    expect(screen.queryByRole('link', { name: '[ download raw ]' })).toBeNull()

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    expect(jpgLink).toBeDefined()
    expect(jpgLink.getAttribute('href')).toBe(NO_RAW_FULL_SRC)
    expect(jpgLink.hasAttribute('download')).toBe(true)
  })
})

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
