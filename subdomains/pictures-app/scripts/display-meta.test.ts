import { describe, it, expect } from 'vitest'
import { resolveDisplayMeta } from './display-meta'
import type { Meta } from './metadata'

function makeMeta(overrides: Partial<Meta> = {}): Meta {
  return {
    title: null,
    caption: null,
    rating: null,
    keywords: [],
    extDescr: null,
    altText: null,
    ...overrides,
  }
}

// ── Core invariant: JPG is authoritative for display fields ───────────────

describe('JPG authoritative: cleared field wins over stale XMP', () => {
  it('title cleared on JPG, stale value in XMP → resolves to null', () => {
    const jpg = makeMeta({ title: null })
    const xmp = makeMeta({ title: 'Stale Title' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.title).toBeNull()
  })

  it('caption cleared on JPG, stale value in XMP → resolves to null', () => {
    const jpg = makeMeta({ caption: null })
    const xmp = makeMeta({ caption: 'Stale Caption' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.caption).toBeNull()
  })

  it('rating cleared on JPG (null), stale value in XMP → resolves to null', () => {
    const jpg = makeMeta({ rating: null })
    const xmp = makeMeta({ rating: 4 })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.rating).toBeNull()
  })

  it('keywords cleared on JPG, stale list in XMP → resolves to empty', () => {
    const jpg = makeMeta({ keywords: [] })
    const xmp = makeMeta({ keywords: ['street', 'photography'] })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.keywords).toEqual([])
  })
})

// ── Non-empty JPG value always wins ──────────────────────────────────────

describe('non-empty JPG value wins over XMP value', () => {
  it('JPG title wins over different XMP title', () => {
    const jpg = makeMeta({ title: 'JPG Title' })
    const xmp = makeMeta({ title: 'XMP Title' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.title).toBe('JPG Title')
  })

  it('JPG caption wins over XMP caption', () => {
    const jpg = makeMeta({ caption: 'JPG Caption' })
    const xmp = makeMeta({ caption: 'XMP Caption' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.caption).toBe('JPG Caption')
  })

  it('JPG rating wins over XMP rating', () => {
    const jpg = makeMeta({ rating: 3 })
    const xmp = makeMeta({ rating: 5 })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.rating).toBe(3)
  })

  it('JPG keywords win over XMP keywords', () => {
    const jpg = makeMeta({ keywords: ['new-kw'] })
    const xmp = makeMeta({ keywords: ['old-kw'] })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.keywords).toEqual(['new-kw'])
  })
})

// ── XMP write-back: cleared JPG field must clear the XMP ─────────────────

describe('XMP write-back when JPG clears a field', () => {
  it('cleared title on JPG causes xmpNeedsUpdate when XMP has value', () => {
    const jpg = makeMeta({ title: null })
    const xmp = makeMeta({ title: 'Stale Title' })
    const { xmpNeedsUpdate } = resolveDisplayMeta(jpg, xmp, null)
    expect(xmpNeedsUpdate).toBe(true)
  })

  it('xmpNeedsUpdate is false when JPG and XMP are already in sync', () => {
    const jpg = makeMeta({ title: 'Same', caption: 'Same' })
    const xmp = makeMeta({ title: 'Same', caption: 'Same' })
    const { xmpNeedsUpdate } = resolveDisplayMeta(jpg, xmp, null)
    expect(xmpNeedsUpdate).toBe(false)
  })

  it('xmpNeedsUpdate is false when both have no values', () => {
    const jpg = makeMeta()
    const xmp = makeMeta()
    const { xmpNeedsUpdate } = resolveDisplayMeta(jpg, xmp, null)
    expect(xmpNeedsUpdate).toBe(false)
  })

  it('JPG value differs from XMP → xmpNeedsUpdate true', () => {
    const jpg = makeMeta({ caption: 'New Caption' })
    const xmp = makeMeta({ caption: 'Old Caption' })
    const { xmpNeedsUpdate } = resolveDisplayMeta(jpg, xmp, null)
    expect(xmpNeedsUpdate).toBe(true)
  })
})

// ── Collection tag projection ─────────────────────────────────────────────
// The collection tag is projected onto the JPG front. The "real" keywords
// (without the collection tag) are what become authoritative and get synced
// to the XMP. The returned desiredJpgKeywords include the projected tag.

describe('collection tag projection', () => {
  it('collection tag is stripped from JPG keywords for authoritative resolution', () => {
    const jpg = makeMeta({ keywords: ['Street Photography', 'urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const tag = 'Street Photography'
    const { authoritative } = resolveDisplayMeta(jpg, xmp, tag)
    // The "real" keywords (authoritative) should not contain the collection tag
    expect(authoritative.keywords).toEqual(['urban'])
  })

  it('desired JPG keywords contain collection tag at front', () => {
    const jpg = makeMeta({ keywords: ['Street Photography', 'urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const tag = 'Street Photography'
    const { desiredJpgKeywords } = resolveDisplayMeta(jpg, xmp, tag)
    expect(desiredJpgKeywords).toEqual(['Street Photography', 'urban'])
  })

  it('collection tag is NOT written into XMP (XMP keywords exclude the tag)', () => {
    const jpg = makeMeta({ keywords: ['Street Photography', 'urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const tag = 'Street Photography'
    const { authoritative } = resolveDisplayMeta(jpg, xmp, tag)
    expect(authoritative.keywords).not.toContain('Street Photography')
  })

  it('collection tag prepended when not already present on JPG', () => {
    const jpg = makeMeta({ keywords: ['urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const tag = 'Street Photography'
    const { desiredJpgKeywords } = resolveDisplayMeta(jpg, xmp, tag)
    expect(desiredJpgKeywords[0]).toBe('Street Photography')
    expect(desiredJpgKeywords).toContain('urban')
  })

  it('no duplication when collection tag already at front', () => {
    const jpg = makeMeta({ keywords: ['Street Photography', 'urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const tag = 'Street Photography'
    const { desiredJpgKeywords } = resolveDisplayMeta(jpg, xmp, tag)
    const count = desiredJpgKeywords.filter(k => k.toLowerCase() === 'street photography').length
    expect(count).toBe(1)
  })

  it('no collection tag when tag is null', () => {
    const jpg = makeMeta({ keywords: ['urban'] })
    const xmp = makeMeta({ keywords: ['urban'] })
    const { desiredJpgKeywords } = resolveDisplayMeta(jpg, xmp, null)
    expect(desiredJpgKeywords).toEqual(['urban'])
  })
})

// ── extDescr and altText are JPG-authoritative too ────────────────────────

describe('extDescr and altText are JPG-authoritative', () => {
  it('extDescr cleared on JPG wins over stale XMP value', () => {
    const jpg = makeMeta({ extDescr: null })
    const xmp = makeMeta({ extDescr: 'sl nc' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.extDescr).toBeNull()
  })

  it('altText cleared on JPG wins over stale XMP value', () => {
    const jpg = makeMeta({ altText: null })
    const xmp = makeMeta({ altText: 'Stale alt text' })
    const { authoritative } = resolveDisplayMeta(jpg, xmp, null)
    expect(authoritative.altText).toBeNull()
  })
})

// ── No XMP (no raw sidecar for this photo) ───────────────────────────────

describe('no XMP sidecar', () => {
  it('returns JPG meta as authoritative when xmpMeta is null', () => {
    const jpg = makeMeta({ title: 'Only JPG', rating: 4 })
    const { authoritative, xmpNeedsUpdate } = resolveDisplayMeta(jpg, null, null)
    expect(authoritative.title).toBe('Only JPG')
    expect(authoritative.rating).toBe(4)
    expect(xmpNeedsUpdate).toBe(false)
  })
})
