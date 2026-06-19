// Pure reconciliation of the hand-edited `sections` array in photos.order.json
// against the collections discovered in the photo library. Curation (order,
// name, color) wins; new collections are inserted by their newest photo's
// date; empty sections drop; `uncategorized` always sinks last; never throws.

export const UNCATEGORIZED_ID = 'uncategorized'

export type Section = {
  id: string
  name: string
  color: string
}

export type DiscoveredCollection = {
  id: string
  /** auto-derived display name (used when the curator hasn't set one) */
  name: string
  /** auto-derived color (used when the curator hasn't set one) */
  color: string
  /** capture date of this collection's newest photo, drives insertion */
  newestDate: string | null
  photoCount: number
}

export type SectionsFile = {
  sections: Section[]
}

export type SectionReconcileResult = {
  next: SectionsFile
  warnings: string[]
}

export function reconcileSections(
  prev: unknown,
  discovered: readonly DiscoveredCollection[],
): SectionReconcileResult {
  const warnings: string[] = []

  const prevSections = readSections(prev)
  const byId = new Map(discovered.map(d => [d.id, d]))

  // Existing curated sections, in their curated order, that still have photos.
  const kept: Section[] = []
  const seen = new Set<string>()
  for (const s of prevSections) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    const d = byId.get(s.id)
    if (!d || d.photoCount === 0) continue // dropped: removed or empty
    kept.push({ id: s.id, name: s.name, color: s.color })
  }

  // Newly-discovered collections (curation absent), inserted by recency.
  const newcomers = discovered
    .filter(d => !seen.has(d.id) && d.photoCount > 0 && d.id !== UNCATEGORIZED_ID)
    .sort((a, b) => byRecencyDescending(a.newestDate, b.newestDate))

  const sections = [...kept]
  for (const d of newcomers) {
    const insertAt = findRecencyAnchor(sections, d.newestDate, byId)
    sections.splice(insertAt, 0, { id: d.id, name: d.name, color: d.color })
  }

  // `uncategorized` always sinks to the very bottom, curated or not.
  const uncatDiscovered = byId.get(UNCATEGORIZED_ID)
  const uncatIdx = sections.findIndex(s => s.id === UNCATEGORIZED_ID)
  if (uncatIdx !== -1) {
    const [uncat] = sections.splice(uncatIdx, 1)
    sections.push(uncat)
  } else if (uncatDiscovered && uncatDiscovered.photoCount > 0) {
    sections.push({
      id: UNCATEGORIZED_ID,
      name: uncatDiscovered.name,
      color: uncatDiscovered.color,
    })
  }

  return { next: { sections }, warnings }
}

// Insert before the first section whose newest photo is strictly older, so a
// fresh shoot lands near the top. `uncategorized` is never anchored against.
function findRecencyAnchor(
  sections: readonly Section[],
  date: string | null,
  byId: Map<string, DiscoveredCollection>,
): number {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === UNCATEGORIZED_ID) return i
    const existing = byId.get(sections[i].id)?.newestDate ?? null
    if (isStrictlyOlder(existing, date)) return i
  }
  return sections.length
}

function byRecencyDescending(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b.localeCompare(a)
}

function isStrictlyOlder(a: string | null, b: string | null): boolean {
  if (a === b) return false
  if (a === null) return true
  if (b === null) return false
  return a < b
}

function readSections(source: unknown): Section[] {
  if (source && typeof source === 'object' && 'sections' in source) {
    const value = (source as Record<string, unknown>).sections
    if (Array.isArray(value)) {
      return value.filter(isSection)
    }
  }
  return []
}

function isSection(v: unknown): v is Section {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as Record<string, unknown>).id === 'string' &&
    typeof (v as Record<string, unknown>).name === 'string' &&
    typeof (v as Record<string, unknown>).color === 'string'
  )
}
