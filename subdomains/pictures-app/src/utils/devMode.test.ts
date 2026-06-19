import { describe, it, expect } from 'vitest'
import { resolveDevMode, toggleDevMode, DEV_MODE_KEY } from './devMode'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  }
}

describe('resolveDevMode', () => {
  it('is off by default with no URL param and empty storage', () => {
    expect(resolveDevMode('', fakeStorage())).toBe(false)
  })

  it('turns on from ?dev=1 in the URL', () => {
    expect(resolveDevMode('?dev=1', fakeStorage())).toBe(true)
  })

  it('turns on from a bare ?dev flag', () => {
    expect(resolveDevMode('?dev', fakeStorage())).toBe(true)
  })

  it('lets ?dev=0 force dev mode off even if storage had it on', () => {
    expect(resolveDevMode('?dev=0', fakeStorage({ [DEV_MODE_KEY]: '1' }))).toBe(false)
  })

  it('falls back to stored state when the URL has no dev param', () => {
    expect(resolveDevMode('', fakeStorage({ [DEV_MODE_KEY]: '1' }))).toBe(true)
  })

  it('persists the URL-derived state to storage', () => {
    const storage = fakeStorage()
    resolveDevMode('?dev=1', storage)
    expect(storage.getItem(DEV_MODE_KEY)).toBe('1')
  })
})

describe('toggleDevMode', () => {
  it('flips stored off to on and returns the new value', () => {
    const storage = fakeStorage()
    expect(toggleDevMode(storage)).toBe(true)
    expect(storage.getItem(DEV_MODE_KEY)).toBe('1')
  })

  it('flips stored on to off', () => {
    const storage = fakeStorage({ [DEV_MODE_KEY]: '1' })
    expect(toggleDevMode(storage)).toBe(false)
    expect(storage.getItem(DEV_MODE_KEY)).toBe('0')
  })
})
