import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import DetailPage from './DetailPage'
import { WithPhotoData } from '../test/fixtureProvider'

// The first photo in the photos array — has a non-null rawUrl (ARW)
const TEST_SLUG = 'dsc02689'
const FULL_SRC = '/photos/DSC02689.jpg'
const RAW_URL = 'https://firebasestorage.googleapis.com/v0/b/benwilcoxdev.firebasestorage.app/o/raw%2FDSC02689.ARW?alt=media&token=cc084336-db03-42b2-9923-92e932f8a0c4'

// JPEG-only capture: rawUrl is null in photos.ts
const NO_RAW_SLUG = 'dsc03276-2'
const NO_RAW_FULL_SRC = '/photos/DSC03276-2.jpg'

/** The clickable desktop hero img (distinct from the mobile carousel slides). */
function desktopHero(): HTMLImageElement {
  return document.querySelector('.detail-photo-desktop') as HTMLImageElement
}

function renderDetailPage(slug: string) {
  return render(
    <WithPhotoData>
      <MemoryRouter initialEntries={[`/${slug}`]}>
        <Routes>
          <Route path="/:slug" element={<DetailPage />} />
        </Routes>
      </MemoryRouter>
    </WithPhotoData>
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

describe('DetailPage sidebar order', () => {
  it('renders the download buttons above the exif and edits blocks', () => {
    renderDetailPage(TEST_SLUG)

    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    const exifKey = screen.getByText('aperture')
    const editsLabel = screen.getByText('lightroom edits')

    // download must come before exif and before edits in document order
    expect(jpgLink.compareDocumentPosition(exifKey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(jpgLink.compareDocumentPosition(editsLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the title above the download buttons', () => {
    renderDetailPage('dsc03860') // has title "Bench"
    const jpgLink = screen.getByRole('link', { name: '[ download jpg ]' })
    const title = document.querySelector('.detail-photo-title')
    expect(title).not.toBeNull()
    expect(title!.compareDocumentPosition(jpgLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('DetailPage sidebar tint', () => {
  it('sets the sidebar tint variable to the first collection color when the photo has a collection', () => {
    // dsc02689 belongs to ft-davis-2026 (#a1cece)
    renderDetailPage(TEST_SLUG)
    const sidebar = document.querySelector('.detail-sidebar') as HTMLElement
    expect(sidebar.style.getPropertyValue('--sidebar-tint')).toBe('#a1cece')
  })
})

describe('DetailPage Escape key', () => {
  function renderWithLocation(slug: string) {
    let location: string | undefined
    function LocationProbe() {
      location = useLocation().pathname
      return null
    }
    render(
      <WithPhotoData>
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/" element={<LocationProbe />} />
            <Route path="/:slug" element={<DetailPage />} />
          </Routes>
        </MemoryRouter>
      </WithPhotoData>
    )
    return () => location
  }

  it('navigates to the gallery when Escape is pressed', () => {
    const getLocation = renderWithLocation(TEST_SLUG)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(getLocation()).toBe('/')
  })

  it('closes the lightbox and does NOT navigate when Escape is pressed while the lightbox is open', () => {
    const getLocation = renderWithLocation(TEST_SLUG)

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
    renderDetailPage(TEST_SLUG)
    // YARL renders a root container with class yarl__root when open; should not be present initially
    expect(document.querySelector('.yarl__root')).toBeNull()
  })

  it('clicking the hero image opens the lightbox showing the full-res src', () => {
    renderDetailPage(TEST_SLUG)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // YARL renders the lightbox portal; assert it now appears in the DOM
    const lightboxContainer = document.querySelector('.yarl__root')
    expect(lightboxContainer).not.toBeNull()

    // Assert the full-res src is present somewhere in the lightbox markup
    const allImgs = document.querySelectorAll('img')
    const fullResImg = Array.from(allImgs).find(img => img.src.includes(FULL_SRC.replace('/photos/', '')))
    expect(fullResImg).not.toBeUndefined()
  })

  it('lightbox HAS native prev/next carousel navigation (carousel over all photos)', () => {
    renderDetailPage(TEST_SLUG)

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // Re-enabled native carousel nav buttons should now exist.
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeNull()
  })

  it('opens the lightbox at the index of the current photo, not index 0', () => {
    // dsc02731 is the 2nd photo (index 1) in the chronological order
    renderDetailPage('dsc02731')

    const heroImg = desktopHero()
    fireEvent.click(heroImg)

    // The lightbox should show this photo's full-res image (its slide), so the
    // previous button should be enabled (not the first slide). The "Previous"
    // button is only disabled on slide 0 of a finite carousel.
    const prevBtn = screen.queryByRole('button', { name: /previous/i }) as HTMLButtonElement | null
    expect(prevBtn).not.toBeNull()
    expect(prevBtn!.disabled).toBe(false)
  })
})
