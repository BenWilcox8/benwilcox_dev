import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CollectionRailDrawer from './CollectionRailDrawer'
import { type RailSection } from './CollectionRail'
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

function renderDrawer(props: { activeId?: string } = {}) {
  const sections = onPageSections()
  return {
    sections,
    ...render(
      <PhotoDataProvider value={fixturePhotoData}>
        <MemoryRouter initialEntries={['/']}>
          <CollectionRailDrawer sections={sections} activeId={props.activeId} />
        </MemoryRouter>
      </PhotoDataProvider>,
    ),
  }
}

describe('CollectionRailDrawer', () => {
  it('shows a hamburger toggle and the drawer is closed by default', () => {
    const { container } = renderDrawer()

    const toggle = container.querySelector('.collection-rail-hamburger')
    expect(toggle).toBeTruthy()

    const drawer = container.querySelector('.collection-rail-drawer')
    expect(drawer).toBeTruthy()
    expect(drawer!.classList.contains('collection-rail-drawer-open')).toBe(false)
  })

  it('clicking the hamburger opens the drawer', () => {
    const { container } = renderDrawer()

    const toggle = container.querySelector(
      '.collection-rail-hamburger',
    ) as HTMLButtonElement
    fireEvent.click(toggle)

    const drawer = container.querySelector('.collection-rail-drawer')!
    expect(drawer.classList.contains('collection-rail-drawer-open')).toBe(true)
  })

  it('the × control closes the drawer', () => {
    const { container } = renderDrawer()

    fireEvent.click(
      container.querySelector('.collection-rail-hamburger') as HTMLButtonElement,
    )
    expect(
      container
        .querySelector('.collection-rail-drawer')!
        .classList.contains('collection-rail-drawer-open'),
    ).toBe(true)

    const close = container.querySelector(
      '.collection-rail-drawer-close',
    ) as HTMLButtonElement
    expect(close).toBeTruthy()
    fireEvent.click(close)

    expect(
      container
        .querySelector('.collection-rail-drawer')!
        .classList.contains('collection-rail-drawer-open'),
    ).toBe(false)
  })

  it('renders the same rail content (circles + labels) inside the drawer', () => {
    const { sections, container } = renderDrawer()

    const drawer = container.querySelector('.collection-rail-drawer')!
    const labels = Array.from(
      drawer.querySelectorAll('.collection-rail-label'),
    ).map(el => el.textContent)
    expect(labels).toEqual(sections.map(s => s.collection.name))
    expect(drawer.querySelectorAll('.collection-rail-circle').length).toBe(
      sections.length,
    )
  })

  it('tapping a collection navigates via #collection-<id> and does NOT close the drawer', () => {
    const { sections, container } = renderDrawer()

    fireEvent.click(
      container.querySelector('.collection-rail-hamburger') as HTMLButtonElement,
    )

    const target = sections[1].collection
    const drawer = container.querySelector('.collection-rail-drawer')!
    const link = drawer.querySelector(
      `.collection-rail-entry[data-collection-id="${target.id}"] a`,
    ) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(collectionHashForId(target.id))

    fireEvent.click(link)

    // Drawer stays open after navigating.
    expect(
      container
        .querySelector('.collection-rail-drawer')!
        .classList.contains('collection-rail-drawer-open'),
    ).toBe(true)
  })

  it('reflects the active collection inside the drawer', () => {
    const expected = onPageSections()
    const { container } = renderDrawer({ activeId: expected[1].collection.id })

    const active = container.querySelectorAll('.collection-rail-circle-active')
    expect(active.length).toBe(1)
    const entry = container.querySelector(
      `.collection-rail-entry[data-collection-id="${expected[1].collection.id}"]`,
    ) as HTMLElement
    expect(
      entry
        .querySelector('.collection-rail-circle')!
        .classList.contains('collection-rail-circle-active'),
    ).toBe(true)
  })
})
