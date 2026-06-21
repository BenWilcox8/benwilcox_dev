/**
 * Pure scroll-spy decision helper.
 *
 * Given the viewport-relative top of each section (in document order) and a
 * small top offset (e.g. sticky-header height), returns the id of the
 * "active" section — the topmost section that has already reached or passed
 * the offset line.
 *
 * If every section is still below the offset (user is scrolled above all
 * content), the first section's id is returned so the indicator is never
 * blank.
 *
 * Returns `undefined` only for an empty input array.
 */
export function activeSection(
  sections: Array<{ id: string; top: number }>,
  offset: number,
): string | undefined {
  if (sections.length === 0) return undefined

  // Walk in document order; keep updating the candidate whenever a section's
  // top is at or above the offset. The last qualifying section is the one the
  // user is currently scrolled into.
  let candidate: string | undefined = undefined

  for (const section of sections) {
    if (section.top <= offset) {
      candidate = section.id
    }
  }

  // If nothing qualifies (all tops are below the offset), fall back to the
  // first section so the indicator is never blank.
  return candidate ?? sections[0].id
}
