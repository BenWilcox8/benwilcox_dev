import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GalleryPage from './GalleryPage'

function renderGallery(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GalleryPage />
    </MemoryRouter>
  )
}

describe('GalleryPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a collection name for each non-empty section', () => {
    renderGallery()
    // "Austin June 2026" is a real, non-empty collection in the generated content
    expect(screen.getByText('Austin June 2026')).toBeInTheDocument()
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
