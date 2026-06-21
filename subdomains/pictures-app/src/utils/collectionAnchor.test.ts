import { describe, it, expect } from 'vitest'
import {
  collectionHashForId,
  idFromCollectionHash,
  isCollectionHash,
} from './collectionAnchor'

describe('collectionHashForId', () => {
  it('builds a hash of the form #collection-<id>', () => {
    expect(collectionHashForId('nature')).toBe('#collection-nature')
  })

  it('works with numeric-looking ids', () => {
    expect(collectionHashForId('42')).toBe('#collection-42')
  })

  it('works with hyphenated ids', () => {
    expect(collectionHashForId('city-life')).toBe('#collection-city-life')
  })
})

describe('idFromCollectionHash', () => {
  it('parses the collection id out of a #collection-<id> hash', () => {
    expect(idFromCollectionHash('#collection-nature')).toBe('nature')
  })

  it('handles hyphenated ids', () => {
    expect(idFromCollectionHash('#collection-city-life')).toBe('city-life')
  })

  it('returns null for a plain photo-slug hash', () => {
    expect(idFromCollectionHash('#dsc03829')).toBeNull()
  })

  it('returns null for an empty hash', () => {
    expect(idFromCollectionHash('')).toBeNull()
  })

  it('returns null for a bare #', () => {
    expect(idFromCollectionHash('#')).toBeNull()
  })

  it('returns null for a hash that is just the prefix with nothing after', () => {
    expect(idFromCollectionHash('#collection-')).toBeNull()
  })
})

describe('isCollectionHash', () => {
  it('returns true for a collection hash', () => {
    expect(isCollectionHash('#collection-nature')).toBe(true)
  })

  it('returns true for a collection hash with hyphenated id', () => {
    expect(isCollectionHash('#collection-city-life')).toBe(true)
  })

  it('returns false for a photo-slug hash', () => {
    expect(isCollectionHash('#dsc03829')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isCollectionHash('')).toBe(false)
  })

  it('returns false for a bare #', () => {
    expect(isCollectionHash('#')).toBe(false)
  })

  it('returns false for just the prefix with no id', () => {
    expect(isCollectionHash('#collection-')).toBe(false)
  })
})
