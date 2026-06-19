// Pure reconciliation of the hand-edited `photos.order.json` against the
// current photo library. Keeps the curator's manual photo order across
// generate/sync runs, date-anchors new photos, drops removed/unknown slugs,
// and self-heals malformed input — the build must never fail on this file.

export type CurrentPhoto = {
  slug: string
  date: string | null
  collectionIds: string[]
}

export type OrderFile = {
  photoOrder: string[]
}

export type ReconcileResult = {
  next: OrderFile
  warnings: string[]
}

export function reconcilePhotoOrder(
  prev: unknown,
  current: readonly CurrentPhoto[],
): ReconcileResult {
  const warnings: string[] = []

  const prevOrder = readStringArray(prev, 'photoOrder')

  const knownSlugs = new Set(current.map(p => p.slug))
  const dateBySlug = new Map(current.map(p => [p.slug, p.date]))

  // Surviving slugs in their manual relative order, de-duped (first wins).
  const seen = new Set<string>()
  const survivors: string[] = []
  for (const slug of prevOrder) {
    if (seen.has(slug)) continue
    seen.add(slug)
    if (!knownSlugs.has(slug)) {
      const msg = `Dropping unknown slug "${slug}" from photos.order.json`
      warnings.push(msg)
      console.warn(msg)
      continue
    }
    survivors.push(slug)
  }

  // New/missing photos (not already placed) are inserted by date-anchored
  // insert: before the first surviving entry with a strictly-older date.
  const placed = new Set(survivors)
  const newcomers = current.filter(p => !placed.has(p.slug))

  const photoOrder = [...survivors]
  for (const photo of newcomers) {
    const insertAt = findDateAnchor(photoOrder, photo.date, dateBySlug)
    photoOrder.splice(insertAt, 0, photo.slug)
  }

  return { next: { photoOrder }, warnings }
}

// Index of the first entry whose date is strictly older than `date`; the
// newcomer is inserted there so newer work surfaces above older work.
function findDateAnchor(
  order: readonly string[],
  date: string | null,
  dateBySlug: Map<string, string | null>,
): number {
  for (let i = 0; i < order.length; i++) {
    const existing = dateBySlug.get(order[i]) ?? null
    if (isStrictlyOlder(existing, date)) return i
  }
  return order.length
}

// Is `a` strictly older (earlier capture date) than `b`? Undated counts as
// oldest, so a dated newcomer anchors above undated entries.
function isStrictlyOlder(a: string | null, b: string | null): boolean {
  if (a === b) return false
  if (a === null) return true
  if (b === null) return false
  return a < b
}

/**
 * Stable sort of `items` by their slug's position in `slugOrder`. Items whose
 * slug isn't in the list keep their original relative order and are appended
 * after the ordered ones. The gallery uses this to lay each section out in the
 * curator's global photo order.
 */
export function orderBySlugList<T extends { slug: string }>(
  items: readonly T[],
  slugOrder: readonly string[],
): T[] {
  const rank = new Map<string, number>()
  slugOrder.forEach((slug, i) => {
    if (!rank.has(slug)) rank.set(slug, i)
  })
  return [...items]
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = rank.get(a.item.slug)
      const rb = rank.get(b.item.slug)
      if (ra === undefined && rb === undefined) return a.i - b.i
      if (ra === undefined) return 1
      if (rb === undefined) return -1
      return ra - rb
    })
    .map(({ item }) => item)
}

function readStringArray(source: unknown, key: string): string[] {
  if (source && typeof source === 'object' && key in source) {
    const value = (source as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string')
    }
  }
  return []
}
