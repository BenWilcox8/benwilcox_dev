import { describe, it, expect } from 'vitest'
import { assignPhotosToSections } from './sections'

type C = { id: string; name: string; color: string }
type P = { slug: string; collections: string[] }

const collections: C[] = [
  { id: 'street', name: 'Street', color: '#f00' },
  { id: 'nature', name: 'Nature', color: '#0f0' },
  { id: 'misc', name: 'Misc', color: '#00f' },
]

describe('assignPhotosToSections', () => {
  it('places each photo once, in its highest-precedence collection', () => {
    const photos: P[] = [
      { slug: 'a', collections: ['nature', 'street'] }, // street wins (listed first)
      { slug: 'b', collections: ['nature'] },
    ]
    const sections = assignPhotosToSections(collections, photos)

    const street = sections.find(s => s.collection.id === 'street')!
    const nature = sections.find(s => s.collection.id === 'nature')!
    expect(street.sectionPhotos.map(p => p.slug)).toEqual(['a'])
    expect(nature.sectionPhotos.map(p => p.slug)).toEqual(['b'])
  })

  it('returns sections in collection order', () => {
    const photos: P[] = [{ slug: 'a', collections: ['misc'] }]
    const sections = assignPhotosToSections(collections, photos)
    expect(sections.map(s => s.collection.id)).toEqual(['street', 'nature', 'misc'])
  })

  it('drops sections that end up with no photos', () => {
    const photos: P[] = [{ slug: 'a', collections: ['street'] }]
    const sections = assignPhotosToSections(collections, photos, { dropEmpty: true })
    expect(sections.map(s => s.collection.id)).toEqual(['street'])
  })

  it('never shows the same photo in two sections', () => {
    const photos: P[] = [{ slug: 'a', collections: ['street', 'nature', 'misc'] }]
    const sections = assignPhotosToSections(collections, photos)
    const appearances = sections.flatMap(s => s.sectionPhotos.map(p => p.slug))
    expect(appearances).toEqual(['a'])
  })
})
