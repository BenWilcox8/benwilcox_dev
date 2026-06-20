import { describe, it, expect } from 'vitest'
import { isPublished, selectPublishedSlugs, diffPublishSet } from './publish'

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
