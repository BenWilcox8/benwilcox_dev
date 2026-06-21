import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import HeroSlide from './HeroSlide'

const THUMB = '/thumbs/dsc04050.webp'
const DISPLAY = '/display/dsc04050.webp'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HeroSlide backdrop', () => {
  it('sources the backdrop from the thumbnail derivative, not the display derivative', () => {
    const { container } = render(
      <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
    )
    const backdrop = container.querySelector('.mobile-hero-slide-backdrop') as HTMLElement
    expect(backdrop).not.toBeNull()
    expect(backdrop.style.backgroundImage).toContain(THUMB)
    expect(backdrop.style.backgroundImage).not.toContain(DISPLAY)
  })
})

describe('HeroSlide progressive foreground image', () => {
  it('initially paints the thumbnail src on the foreground image', () => {
    const { container } = render(
      <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe(THUMB)
  })

  it('upgrades to the display src after decode resolves', async () => {
    // Stub Image.decode so it resolves immediately.
    const originalImage = globalThis.Image
    // Track decode promise resolution outside the class so we can flush it.
    let resolveDecodePromise!: () => void
    const decodePromise = new Promise<void>(res => { resolveDecodePromise = res })
    class MockImage {
      src = ''
      decode = vi.fn().mockReturnValue(decodePromise)
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    globalThis.Image = MockImage as unknown as typeof Image

    const { container } = render(
      <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
    )

    // Initially still on thumb.
    const imgBefore = container.querySelector('img') as HTMLImageElement
    expect(imgBefore.getAttribute('src')).toBe(THUMB)

    // Resolve decode and flush React state update.
    await act(async () => {
      resolveDecodePromise()
      await decodePromise
    })

    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe(DISPLAY)

    globalThis.Image = originalImage
  })

  it('marks the slide with data-active when isActive is true', () => {
    const { container } = render(
      <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={true} />,
    )
    const slide = container.querySelector('.mobile-hero-slide') as HTMLElement
    expect(slide.dataset.active).toBe('true')
  })

  it('does NOT set data-active when isActive is false', () => {
    const { container } = render(
      <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
    )
    const slide = container.querySelector('.mobile-hero-slide') as HTMLElement
    expect(slide.dataset.active).toBeUndefined()
  })
})
