import '@testing-library/jest-dom'

// jsdom does not implement matchMedia; embla-carousel reads it during init.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// jsdom does not implement these observer APIs. BinPackGrid uses ResizeObserver
// to measure its container; embla-carousel constructs both on init; the
// progressive image upgrade uses IntersectionObserver. A no-op stub lets the
// components mount in tests (measured width stays 0).
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver
}

// jsdom does not implement requestIdleCallback; the progressive image upgrade
// uses it (with a setTimeout fallback) for its off-screen prefetch pass. A
// no-op stub keeps tests deterministic without scheduling real callbacks.
if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = ((cb: IdleRequestCallback) =>
    setTimeout(() =>
      cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline),
    ) as unknown as number) as typeof requestIdleCallback
  globalThis.cancelIdleCallback = ((id: number) =>
    clearTimeout(id)) as typeof cancelIdleCallback
}

// jsdom in this environment does not provide a working localStorage, which the
// gallery dev-mode toggle relies on. Provide a minimal in-memory Storage.
if (typeof window.localStorage?.clear !== 'function') {
  const store = new Map<string, string>()
  const localStorageMock: Storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  })
}
