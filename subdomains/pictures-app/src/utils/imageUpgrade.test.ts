import { describe, it, expect } from 'vitest'
import { shouldIdlePrefetch } from './imageUpgrade'

describe('shouldIdlePrefetch', () => {
  it('prefetches when no connection info is available', () => {
    expect(shouldIdlePrefetch(undefined)).toBe(true)
  })

  it('backs off when Save-Data is enabled', () => {
    expect(shouldIdlePrefetch({ saveData: true })).toBe(false)
  })

  it('backs off on slow effective connection types', () => {
    expect(shouldIdlePrefetch({ effectiveType: '2g' })).toBe(false)
    expect(shouldIdlePrefetch({ effectiveType: 'slow-2g' })).toBe(false)
  })

  it('prefetches on fast connections', () => {
    expect(shouldIdlePrefetch({ effectiveType: '4g' })).toBe(true)
    expect(shouldIdlePrefetch({ saveData: false, effectiveType: '3g' })).toBe(true)
  })
})
