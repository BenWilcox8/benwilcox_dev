import { describe, it, expect } from 'vitest'
import { buildStorageUrl, storageObjectPath, deriveStorageSrcs } from './storageUrls'

const BUCKET = 'benwilcoxdev.firebasestorage.app'

describe('buildStorageUrl', () => {
  it('builds a clean public Storage URL for a thumb', () => {
    expect(buildStorageUrl(BUCKET, 'dsc02689', 'thumb')).toBe(
      `https://storage.googleapis.com/${BUCKET}/thumbs/dsc02689.webp`,
    )
  })

  it('builds display, full, raw, and xmp URLs at fixed slug paths', () => {
    expect(buildStorageUrl(BUCKET, 'dsc02689', 'display')).toBe(
      `https://storage.googleapis.com/${BUCKET}/display/dsc02689.webp`,
    )
    expect(buildStorageUrl(BUCKET, 'dsc02689', 'full')).toBe(
      `https://storage.googleapis.com/${BUCKET}/photos/dsc02689.jpg`,
    )
    expect(buildStorageUrl(BUCKET, 'dsc02689', 'raw')).toBe(
      `https://storage.googleapis.com/${BUCKET}/raw/dsc02689.arw`,
    )
    expect(buildStorageUrl(BUCKET, 'dsc02689', 'xmp')).toBe(
      `https://storage.googleapis.com/${BUCKET}/photos/dsc02689.xmp`,
    )
  })

  it('carries no download token (objects are world-readable)', () => {
    const url = buildStorageUrl(BUCKET, 'dsc02689', 'full')
    expect(url).not.toContain('token')
    expect(url).not.toContain('?')
  })

  it('embeds the given bucket name', () => {
    expect(buildStorageUrl('other-bucket.app', 'dsc1', 'thumb')).toBe(
      'https://storage.googleapis.com/other-bucket.app/thumbs/dsc1.webp',
    )
  })
})

describe('storageObjectPath', () => {
  it('returns the bucket-relative key for each kind', () => {
    expect(storageObjectPath('dsc1', 'thumb')).toBe('thumbs/dsc1.webp')
    expect(storageObjectPath('dsc1', 'display')).toBe('display/dsc1.webp')
    expect(storageObjectPath('dsc1', 'full')).toBe('photos/dsc1.jpg')
    expect(storageObjectPath('dsc1', 'raw')).toBe('raw/dsc1.arw')
    expect(storageObjectPath('dsc1', 'xmp')).toBe('photos/dsc1.xmp')
  })
})

describe('deriveStorageSrcs', () => {
  it('maps a (bucket, slug) to the manifest thumb/display/full URL fields', () => {
    const srcs = deriveStorageSrcs(BUCKET, 'dsc02689')
    expect(srcs.thumbSrc).toBe(`https://storage.googleapis.com/${BUCKET}/thumbs/dsc02689.webp`)
    expect(srcs.displaySrc).toBe(`https://storage.googleapis.com/${BUCKET}/display/dsc02689.webp`)
    expect(srcs.fullSrc).toBe(`https://storage.googleapis.com/${BUCKET}/photos/dsc02689.jpg`)
  })
})
