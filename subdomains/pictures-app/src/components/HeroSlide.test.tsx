import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import HeroSlide from './HeroSlide'

const THUMB = '/thumbs/dsc04050.webp'
const DISPLAY = '/display/dsc04050.webp'

// A controllable IntersectionObserver stub: tests drive intersection on demand
// (the global setup stub is a no-op that never fires). Returns a handle whose
// `enter()`/`leave()` flip the observed slide in/out of view.
function installControllableIO() {
  const callbacks: ReadonlyArray<{ cb: IntersectionObserverCallback; els: Element[] }> = []
  const registry = callbacks as Array<{ cb: IntersectionObserverCallback; els: Element[] }>
  class IO {
    cb: IntersectionObserverCallback
    els: Element[] = []
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb
      registry.push({ cb, els: this.els })
    }
    observe(el: Element) {
      this.els.push(el)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  const original = globalThis.IntersectionObserver
  globalThis.IntersectionObserver = IO as unknown as typeof IntersectionObserver
  const fire = (isIntersecting: boolean) => {
    for (const { cb, els } of registry) {
      cb(
        els.map(target => ({ isIntersecting, target }) as IntersectionObserverEntry),
        {} as IntersectionObserver,
      )
    }
  }
  return {
    enter: () => act(() => fire(true)),
    leave: () => act(() => fire(false)),
    restore: () => {
      globalThis.IntersectionObserver = original
    },
  }
}

// Mock Image whose decode() resolves only when the test calls the returned
// resolver, so the thumb->display swap is deterministic.
function installDeferredImage() {
  const original = globalThis.Image
  let resolveDecode!: () => void
  const decodePromise = new Promise<void>(res => {
    resolveDecode = res
  })
  const decode = vi.fn().mockReturnValue(decodePromise)
  class MockImage {
    src = ''
    decode = decode
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
  }
  globalThis.Image = MockImage as unknown as typeof Image
  return {
    decode,
    resolve: async () => {
      await act(async () => {
        resolveDecode()
        await decodePromise
      })
    },
    restore: () => {
      globalThis.Image = original
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HeroSlide lazy display upgrade (gated on intersection)', () => {
  it('does NOT start the display decode until the slide intersects', () => {
    const io = installControllableIO()
    const image = installDeferredImage()
    try {
      const { container } = render(
        <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
      )
      // Before intersecting: still on the thumbnail and no decode kicked off.
      const img = container.querySelector('img') as HTMLImageElement
      expect(img.getAttribute('src')).toBe(THUMB)
      expect(image.decode).not.toHaveBeenCalled()
    } finally {
      image.restore()
      io.restore()
    }
  })

  it('upgrades to the display src only after it intersects and decode resolves', async () => {
    const io = installControllableIO()
    const image = installDeferredImage()
    try {
      const { container } = render(
        <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
      )

      io.enter()
      expect(image.decode).toHaveBeenCalled()
      await image.resolve()

      const img = container.querySelector('img') as HTMLImageElement
      expect(img.getAttribute('src')).toBe(DISPLAY)
    } finally {
      image.restore()
      io.restore()
    }
  })
})

describe('HeroSlide backdrop is gated on intersection', () => {
  it('does not render the blurred backdrop until the slide is in view', () => {
    const io = installControllableIO()
    try {
      const { container } = render(
        <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
      )
      expect(container.querySelector('.mobile-hero-slide-backdrop')).toBeNull()
      io.enter()
      expect(container.querySelector('.mobile-hero-slide-backdrop')).not.toBeNull()
    } finally {
      io.restore()
    }
  })

  it('unmounts the backdrop again once the slide leaves view', () => {
    const io = installControllableIO()
    try {
      const { container } = render(
        <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
      )
      io.enter()
      expect(container.querySelector('.mobile-hero-slide-backdrop')).not.toBeNull()
      io.leave()
      expect(container.querySelector('.mobile-hero-slide-backdrop')).toBeNull()
    } finally {
      io.restore()
    }
  })
})

describe('HeroSlide backdrop', () => {
  it('sources the backdrop from the thumbnail derivative, not the display derivative', () => {
    const io = installControllableIO()
    try {
      const { container } = render(
        <HeroSlide slug="dsc04050" thumbSrc={THUMB} displaySrc={DISPLAY} isActive={false} />,
      )
      io.enter()
      const backdrop = container.querySelector('.mobile-hero-slide-backdrop') as HTMLElement
      expect(backdrop).not.toBeNull()
      expect(backdrop.style.backgroundImage).toContain(THUMB)
      expect(backdrop.style.backgroundImage).not.toContain(DISPLAY)
    } finally {
      io.restore()
    }
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
