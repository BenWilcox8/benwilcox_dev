import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BinPackGrid from './BinPackGrid'
import type { Photo } from '../types/photos'

// Force a measured container width so tiles actually render (the default
// no-op ResizeObserver stub leaves width at 0 and renders nothing).
function installSizedResizeObserver(width: number) {
  class SizedRO {
    cb: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb
    }
    observe() {
      this.cb(
        [{ contentRect: { width } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  globalThis.ResizeObserver = SizedRO as unknown as typeof ResizeObserver
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    slug: 'dsc04050',
    collections: [],
    explicitSize: 'medium',
    aspectRatio: 1.5,
    thumbSrc: '/thumbs/dsc04050.webp',
    displaySrc: '/display/dsc04050.webp',
    fullSrc: '/photos/DSC04050.jpg',
    rawUrl: null,
    date: null,
    location: null,
    title: null,
    caption: null,
    rating: 4,
    exif: {
      aperture: 'f/2.8',
      shutter: '1/250s',
      iso: 400,
      focalLength: '35mm',
      camera: null,
      lens: null,
    },
    edits: null,
    ...overrides,
  }
}

function renderGrid(photos: Photo[]) {
  return render(
    <MemoryRouter>
      <BinPackGrid photos={photos} />
    </MemoryRouter>,
  )
}

describe('BinPackGrid hover info card', () => {
  const originalRO = globalThis.ResizeObserver
  beforeEach(() => installSizedResizeObserver(1000))
  afterEach(() => {
    globalThis.ResizeObserver = originalRO
    vi.restoreAllMocks()
  })

  it('renders an always-on info card with the photo metadata (no dev mode)', () => {
    renderGrid([makePhoto()])
    const card = screen.getByText(/dsc04050/)
    expect(card).toHaveTextContent('dsc04050')
    expect(card).toHaveTextContent('ar 1.50')
    expect(card).toHaveTextContent('4★')
    expect(card).toHaveTextContent('f/2.8')
    expect(card).toHaveTextContent('1/250s')
    expect(card).toHaveTextContent('ISO 400')
  })

  it('still links the tile to the detail page', () => {
    renderGrid([makePhoto()])
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dsc04050')
  })
})
