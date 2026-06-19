/**
 * Assign each photo to exactly one collection section: the highest-precedence
 * collection it belongs to (precedence = the order collections are listed).
 * A photo never appears in more than one section.
 */
export function assignPhotosToSections<
  C extends { id: string },
  P extends { collections: string[] },
>(
  collections: C[],
  photos: P[],
  options: { dropEmpty?: boolean } = {},
): Array<{ collection: C; sectionPhotos: P[] }> {
  const shown = new Set<P>()
  const sections = collections.map(collection => {
    const sectionPhotos = photos.filter(
      p => !shown.has(p) && p.collections.includes(collection.id),
    )
    sectionPhotos.forEach(p => shown.add(p))
    return { collection, sectionPhotos }
  })
  return options.dropEmpty
    ? sections.filter(s => s.sectionPhotos.length > 0)
    : sections
}
