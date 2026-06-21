import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery, MOBILE_MEDIA_QUERY } from './useMediaQuery'

/**
 * Build a controllable matchMedia stub: it reports `initialMatches` and lets the
 * test flip the result and fire the registered change listeners, mirroring how a
 * real browser notifies subscribers when the viewport crosses the breakpoint.
 */
function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    get matches() {
      return matches
    },
    media: '',
    onchange: null,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb)
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
  const matchMedia = vi.fn((query: string) => {
    mql.media = query
    return mql as unknown as MediaQueryList
  })
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia
  return {
    matchMedia,
    setMatches(next: boolean) {
      matches = next
      for (const cb of listeners) {
        cb({ matches: next } as MediaQueryListEvent)
      }
    },
    listenerCount: () => listeners.size,
  }
}

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('returns the initial match state of the query', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery(MOBILE_MEDIA_QUERY))
    expect(result.current).toBe(true)
  })

  it('returns false when the query does not initially match', () => {
    installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery(MOBILE_MEDIA_QUERY))
    expect(result.current).toBe(false)
  })

  it('uses the given media query string', () => {
    const stub = installMatchMedia(false)
    renderHook(() => useMediaQuery(MOBILE_MEDIA_QUERY))
    expect(stub.matchMedia).toHaveBeenCalledWith(MOBILE_MEDIA_QUERY)
  })

  it('updates when the media query result changes', () => {
    const stub = installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery(MOBILE_MEDIA_QUERY))
    expect(result.current).toBe(false)

    act(() => stub.setMatches(true))
    expect(result.current).toBe(true)

    act(() => stub.setMatches(false))
    expect(result.current).toBe(false)
  })

  it('unsubscribes the change listener on unmount', () => {
    const stub = installMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery(MOBILE_MEDIA_QUERY))
    expect(stub.listenerCount()).toBe(1)
    unmount()
    expect(stub.listenerCount()).toBe(0)
  })

  it('pins the mobile breakpoint to the 768px max-width matching the stylesheet', () => {
    expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 768px)')
  })
})
