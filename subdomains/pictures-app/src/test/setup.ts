import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver, which BinPackGrid uses to measure its
// container. A no-op stub lets the component mount in tests (width stays 0).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
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
