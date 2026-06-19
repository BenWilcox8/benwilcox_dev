import { describe, it, expect } from 'vitest'
import { formatTileInfo } from './tileInfo'
import type { Photo } from '../types/photos'

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    slug: 'dsc04050',
    collections: [],
    explicitSize: null,
    aspectRatio: 1.5,
    thumbSrc: '',
    displaySrc: '',
    fullSrc: '',
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

describe('formatTileInfo', () => {
  it('exposes filename, aspect ratio, aperture, shutter, ISO and rating', () => {
    const info = formatTileInfo(makePhoto())
    expect(info.filename).toBe('dsc04050')
    expect(info.aspectRatio).toBe('1.50')
    expect(info.aperture).toBe('f/2.8')
    expect(info.shutter).toBe('1/250s')
    expect(info.iso).toBe('400')
    expect(info.rating).toBe('4★')
  })

  it('shows a dash for missing exif fields', () => {
    const info = formatTileInfo(
      makePhoto({
        exif: { aperture: null, shutter: null, iso: null, focalLength: null, camera: null, lens: null },
      }),
    )
    expect(info.aperture).toBe('—')
    expect(info.shutter).toBe('—')
    expect(info.iso).toBe('—')
  })

  it('renders a null rating as 0 stars', () => {
    const info = formatTileInfo(makePhoto({ rating: null }))
    expect(info.rating).toBe('0★')
  })
})
