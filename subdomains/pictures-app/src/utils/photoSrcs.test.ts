import { describe, it, expect } from 'vitest'
import { derivePhotoSrcs } from './photoSrcs'

describe('derivePhotoSrcs', () => {
  it('derives thumbSrc as /thumbs/<slug>.webp', () => {
    const { thumbSrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(thumbSrc).toBe('/thumbs/dsc02689.webp')
  })

  it('derives displaySrc as /display/<slug>.webp', () => {
    const { displaySrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(displaySrc).toBe('/display/dsc02689.webp')
  })

  it('derives fullSrc as /photos/<original-filename>', () => {
    const { fullSrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(fullSrc).toBe('/photos/DSC02689.jpg')
  })

  it('handles filenames with spaces and mixed case', () => {
    const { thumbSrc, displaySrc, fullSrc } = derivePhotoSrcs('My Photo 01.jpg')
    expect(thumbSrc).toBe('/thumbs/my-photo-01.webp')
    expect(displaySrc).toBe('/display/my-photo-01.webp')
    expect(fullSrc).toBe('/photos/My Photo 01.jpg')
  })

  it('handles filenames with underscores', () => {
    const { thumbSrc } = derivePhotoSrcs('some_image.JPG')
    expect(thumbSrc).toBe('/thumbs/some-image.webp')
  })

  it('handles PNG originals', () => {
    const { thumbSrc, displaySrc, fullSrc } = derivePhotoSrcs('shot.png')
    expect(thumbSrc).toBe('/thumbs/shot.webp')
    expect(displaySrc).toBe('/display/shot.webp')
    expect(fullSrc).toBe('/photos/shot.png')
  })
})

describe('derivePhotoSrcs - Photo field wiring contract', () => {
  it('thumbSrc and displaySrc are distinct paths', () => {
    const { thumbSrc, displaySrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(thumbSrc).not.toBe(displaySrc)
  })

  it('fullSrc is distinct from thumbSrc and displaySrc', () => {
    const { thumbSrc, displaySrc, fullSrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(fullSrc).not.toBe(thumbSrc)
    expect(fullSrc).not.toBe(displaySrc)
  })

  it('thumbSrc and displaySrc are WebP', () => {
    const { thumbSrc, displaySrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(thumbSrc).toMatch(/\.webp$/)
    expect(displaySrc).toMatch(/\.webp$/)
  })

  it('fullSrc preserves the original extension', () => {
    const { fullSrc } = derivePhotoSrcs('DSC02689.jpg')
    expect(fullSrc).toMatch(/\.jpg$/)
  })
})
