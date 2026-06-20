import { describe, it, expect } from 'vitest'
import { isPublished, selectPublishedSlugs, diffPublishSet, evaluatePrune } from './publish'

describe('isPublished', () => {
  it('treats the green label as published', () => {
    expect(isPublished('green')).toBe(true)
  })

  it('matches green case-insensitively (and trims)', () => {
    expect(isPublished('Green')).toBe(true)
    expect(isPublished('GREEN')).toBe(true)
    expect(isPublished('  green ')).toBe(true)
  })

  it('does not publish other labels or missing labels', () => {
    expect(isPublished('red')).toBe(false)
    expect(isPublished('blue')).toBe(false)
    expect(isPublished('')).toBe(false)
    expect(isPublished(null)).toBe(false)
    expect(isPublished(undefined)).toBe(false)
  })
})

describe('selectPublishedSlugs', () => {
  it('keeps only the slugs of green-labelled photos', () => {
    const discovered = [
      { slug: 'dsc01', label: 'green' },
      { slug: 'dsc02', label: 'red' },
      { slug: 'dsc03', label: 'GREEN' },
      { slug: 'dsc04', label: null },
    ]
    const published = selectPublishedSlugs(discovered)
    expect([...published].sort()).toEqual(['dsc01', 'dsc03'])
  })

  it('returns an empty set when nothing is green', () => {
    expect(selectPublishedSlugs([{ slug: 'a', label: 'red' }]).size).toBe(0)
  })
})

describe('diffPublishSet', () => {
  it('adds newly-green slugs and removes no-longer-green ones', () => {
    const prev = new Set(['a', 'b', 'c'])
    const green = new Set(['b', 'c', 'd'])
    const { toAdd, toRemove } = diffPublishSet(prev, green)
    expect([...toAdd].sort()).toEqual(['d'])
    expect([...toRemove].sort()).toEqual(['a'])
  })

  it('is idempotent: already-published slugs are not re-added', () => {
    const prev = new Set(['a', 'b'])
    const green = new Set(['a', 'b'])
    const { toAdd, toRemove } = diffPublishSet(prev, green)
    expect(toAdd.size).toBe(0)
    expect(toRemove.size).toBe(0)
  })

  it('first run (empty prev) adds every green slug', () => {
    const { toAdd, toRemove } = diffPublishSet(new Set(), new Set(['a', 'b']))
    expect([...toAdd].sort()).toEqual(['a', 'b'])
    expect(toRemove.size).toBe(0)
  })
})

describe('evaluatePrune', () => {
  it('proceeds with a normal small removal', () => {
    const result = evaluatePrune(10, 2, { force: false })
    expect(result.proceed).toBe(true)
  })

  it('aborts when a run removes more than half the published set', () => {
    const result = evaluatePrune(10, 6, { force: false })
    expect(result.proceed).toBe(false)
    expect(result.reason).toMatch(/force/i)
  })

  it('allows removing exactly half (not strictly over the threshold)', () => {
    expect(evaluatePrune(10, 5, { force: false }).proceed).toBe(true)
  })

  it('proceeds past the threshold when forced', () => {
    expect(evaluatePrune(10, 9, { force: true }).proceed).toBe(true)
  })

  it('removing nothing is always a safe no-op', () => {
    expect(evaluatePrune(0, 0, { force: false }).proceed).toBe(true)
    expect(evaluatePrune(10, 0, { force: false }).proceed).toBe(true)
  })
})
