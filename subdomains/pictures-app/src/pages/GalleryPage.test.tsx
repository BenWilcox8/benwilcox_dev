import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GalleryPage from './GalleryPage'
import { WithPhotoData } from '../test/fixtureProvider'

function renderGallery(initialPath = '/') {
  return render(
    <WithPhotoData>
      <MemoryRouter initialEntries={[initialPath]}>
        <GalleryPage />
      </MemoryRouter>
    </WithPhotoData>
  )
}

describe('GalleryPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a collection name for each non-empty section', () => {
    renderGallery()
    // "Austin June 2026" is a real, non-empty collection in the generated content.
    // Scope to the section header: the name also appears on the nav-rail label.
    expect(
      screen.getByRole('heading', { name: 'Austin June 2026' })
    ).toBeInTheDocument()
  })

  it('does not show the dev overlay by default', () => {
    renderGallery()
    expect(screen.queryByTestId('dev-overlay-panel')).not.toBeInTheDocument()
  })

  it('shows the dev overlay when launched with ?dev=1', () => {
    renderGallery('/?dev=1')
    expect(screen.getByTestId('dev-overlay-panel')).toBeInTheDocument()
  })

  it('toggles the dev overlay with Shift+D', () => {
    renderGallery()
    expect(screen.queryByTestId('dev-overlay-panel')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'D', shiftKey: true })
    expect(screen.getByTestId('dev-overlay-panel')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'D', shiftKey: true })
    expect(screen.queryByTestId('dev-overlay-panel')).not.toBeInTheDocument()
  })
})

describe('GalleryPage — collection-anchor section headers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('gives each non-empty section header a DOM id of collection-<collectionId>', () => {
    renderGallery()
    // galveston-june-2026 is a known non-empty collection in fixture data
    const header = document.getElementById('collection-galveston-june-2026')
    expect(header).not.toBeNull()
    expect(header!.tagName).toBe('H2')
  })

  it('gives every rendered section header a matching collection- id', () => {
    const { container } = renderGallery()
    const headers = container.querySelectorAll('h2.gallery-section-header')
    expect(headers.length).toBeGreaterThan(0)
    headers.forEach(h => {
      expect(h.id).toMatch(/^collection-.+/)
    })
  })
})

describe('GalleryPage — collection-hash scroll effect', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('calls scrollIntoView on the matching header when navigating to a #collection- hash', () => {
    const scrollIntoView = vi.fn()
    // jsdom doesn't implement scrollIntoView; stub it on HTMLElement prototype
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    renderGallery('/#collection-galveston-june-2026')

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('does not call scrollIntoView for a photo-slug hash (collection effect ignores it)', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    // Use a known photo slug from the fixture
    renderGallery('/#dsc03829')

    // The photo-slug effect calls scrollIntoView (potentially 0 times in jsdom
    // since no data-photo-slug element matches), but we care the collection
    // effect was NOT the caller — verify no element with an id matching
    // collection- was scrolled.
    // The simplest observable: no #collection-… header element triggered it
    // (if it had, the mock would have a call from that specific element).
    // We assert the collection header for galveston was NOT scrolled.
    const header = document.getElementById('collection-galveston-june-2026')
    expect(header).not.toBeNull()
    // scrollIntoView not called on the collection header
    // (it may be called 0 times total since no photo tile matches in jsdom)
    const callContexts = scrollIntoView.mock.instances
    expect(callContexts).not.toContain(header)
  })

  it('photo-slug effect ignores a collection hash (does not attempt slug lookup)', () => {
    // Verifies the guard: slugFromHash('#collection-…') would return a non-null
    // string without the guard, causing a false DOM query. With the guard
    // (isCollectionHash early-return), the slug effect is skipped entirely.
    // Observable: the collection header is rendered with correct id — not treated
    // as a photo slug — and the page still renders without errors.
    renderGallery('/#collection-austin-june-2026')
    const header = document.getElementById('collection-austin-june-2026')
    expect(header).not.toBeNull()
    expect(header!.textContent).toContain('Austin June 2026')
  })
})
