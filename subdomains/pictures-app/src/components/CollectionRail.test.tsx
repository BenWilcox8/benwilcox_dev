import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CollectionRail, { type RailSection } from './CollectionRail'
import { fixturePhotoData } from '../test/fixturePhotoData'
import { PhotoDataProvider } from '../content/PhotoDataProvider'
import { assignPhotosToSections } from '../utils/sections'
import { orderBySlugList } from '../utils/orderReconcile'
import { collectionHashForId } from '../utils/collectionAnchor'

const { photos, collections, galleryOrder } = fixturePhotoData

/** The same dropEmpty sections the gallery computes, mapped to the rail shape. */
function onPageSections(): RailSection[] {
  const ordered = orderBySlugList(photos, galleryOrder)
  return assignPhotosToSections(collections, ordered, { dropEmpty: true }).map(
    ({ collection, sectionPhotos }) => ({
      collection,
      photoCount: sectionPhotos.length,
    }),
  )
}

function renderRail(props: { activeId?: string } = {}) {
  const sections = onPageSections()
  return {
    sections,
    ...render(
      <PhotoDataProvider value={fixturePhotoData}>
        <MemoryRouter initialEntries={['/']}>
          <CollectionRail sections={sections} activeId={props.activeId} />
        </MemoryRouter>
      </PhotoDataProvider>,
    ),
  }
}

describe('CollectionRail', () => {
  it('renders exactly one circle + label per on-page collection, in page order', () => {
    const { sections, container } = renderRail()

    const entries = container.querySelectorAll('.collection-rail-entry')
    expect(entries.length).toBe(sections.length)

    // labels in page order
    const labels = Array.from(
      container.querySelectorAll('.collection-rail-label'),
    ).map(el => el.textContent)
    expect(labels).toEqual(sections.map(s => s.collection.name))

    // one circle per entry
    expect(container.querySelectorAll('.collection-rail-circle').length).toBe(
      sections.length,
    )
  })

  it('excludes collections with no on-page photos (e.g. the empty "buildings" collection)', () => {
    const { sections, container } = renderRail()

    // The fixture has a "buildings" collection with no on-page photos.
    expect(collections.some(c => c.id === 'buildings')).toBe(true)
    expect(sections.some(s => s.collection.id === 'buildings')).toBe(false)

    const labels = Array.from(
      container.querySelectorAll('.collection-rail-label'),
    ).map(el => el.textContent)
    expect(labels).not.toContain('buildings')
  })

  it('renders each circle and label in its collection color', () => {
    const { sections, container } = renderRail()

    sections.forEach(({ collection }) => {
      const entry = container.querySelector(
        `.collection-rail-entry[data-collection-id="${collection.id}"]`,
      ) as HTMLElement
      expect(entry).toBeTruthy()
      const label = entry.querySelector('.collection-rail-label') as HTMLElement
      expect(label.style.color).toBe(toRgb(collection.color))
      const circle = entry.querySelector(
        '.collection-rail-circle',
      ) as HTMLElement
      // color drives the ring/fill via the color property
      expect(circle.style.color).toBe(toRgb(collection.color))
    })
  })

  it('fills only the active circle and leaves the rest as hollow rings', () => {
    const expected = onPageSections()
    const { sections, container } = renderRail({
      activeId: expected[1].collection.id,
    })

    const active = container.querySelectorAll('.collection-rail-circle-active')
    expect(active.length).toBe(1)

    const activeEntry = container.querySelector(
      `.collection-rail-entry[data-collection-id="${sections[1].collection.id}"]`,
    ) as HTMLElement
    expect(
      activeEntry
        .querySelector('.collection-rail-circle')!
        .classList.contains('collection-rail-circle-active'),
    ).toBe(true)

    // every other circle is hollow (not active)
    sections
      .filter((_, i) => i !== 1)
      .forEach(({ collection }) => {
        const entry = container.querySelector(
          `.collection-rail-entry[data-collection-id="${collection.id}"]`,
        ) as HTMLElement
        expect(
          entry
            .querySelector('.collection-rail-circle')!
            .classList.contains('collection-rail-circle-active'),
        ).toBe(false)
      })
  })

  it('clicking an entry sets the location hash to #collection-<id>', () => {
    const { sections, container } = renderRail()

    sections.forEach(({ collection }) => {
      const entry = container.querySelector(
        `.collection-rail-entry[data-collection-id="${collection.id}"]`,
      ) as HTMLElement
      const link = entry.querySelector('a') as HTMLAnchorElement
      // The clickable target points at the collection hash.
      expect(link.getAttribute('href')).toBe(collectionHashForId(collection.id))
    })
  })

  it('renders a dark panel and one colored line segment per collection', () => {
    const { sections, container } = renderRail()
    expect(container.querySelector('.collection-rail-panel')).toBeTruthy()
    expect(container.querySelectorAll('.collection-rail-segment').length).toBe(
      sections.length,
    )
  })

  it('colors each line segment with its collection color', () => {
    const { sections, container } = renderRail()
    const segments = Array.from(
      container.querySelectorAll<HTMLElement>('.collection-rail-segment'),
    )
    sections.forEach((s, i) => {
      expect(segments[i].style.background).toBe(toRgb(s.collection.color))
    })
  })

  it('renders a scroll-progress dot positioned by scrollFraction', () => {
    const sections = onPageSections()
    const { container } = render(
      <PhotoDataProvider value={fixturePhotoData}>
        <MemoryRouter initialEntries={['/']}>
          <CollectionRail sections={sections} scrollFraction={0.5} />
        </MemoryRouter>
      </PhotoDataProvider>,
    )
    const dot = container.querySelector(
      '.collection-rail-progress',
    ) as HTMLElement
    expect(dot).toBeTruthy()
    // DEFAULT_RAIL_HEIGHT (600) in jsdom × 0.5 → 300px
    expect(dot.style.top).toBe('300px')
  })
})

/** jsdom serializes inline color styles as rgb(); convert a hex for comparison. */
function toRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
