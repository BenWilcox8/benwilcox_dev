/**
 * Map each section header's measured position on the page to a fraction
 * (0 → top of the rail, 1 → bottom) so its rail circle sits exactly where the
 * scroll dot will be when that section becomes active.
 *
 * A section becomes active when its header reaches `activeOffset` below the
 * viewport top — i.e. at scroll position `top - activeOffset`. The scroll dot is
 * placed at `scrollTop / maxScroll`, so placing the circle at
 * `(top - activeOffset) / maxScroll` keeps the two in sync. The result is
 * clamped to [0, 1].
 *
 * When the page isn't scrollable (`maxScroll <= 0`) there is no meaningful
 * proportion, so the circles fall back to even spacing.
 *
 * @param headers      Section headers in page order, each with its document-top
 *                     pixel position (`getBoundingClientRect().top + scrollY`).
 * @param maxScroll    Scrollable range, `scrollHeight - clientHeight`.
 * @param activeOffset Distance below the viewport top a header must reach to be
 *                     active (matches the scroll-spy's offset).
 */
export type SectionFraction = { id: string; fraction: number }

export function sectionFractions(
  headers: { id: string; top: number }[],
  maxScroll: number,
  activeOffset: number,
): SectionFraction[] {
  const n = headers.length
  if (n === 0) return []

  if (maxScroll <= 0) {
    return headers.map((h, i) => ({
      id: h.id,
      fraction: n === 1 ? 0 : i / (n - 1),
    }))
  }

  return headers.map(h => {
    const f = (h.top - activeOffset) / maxScroll
    return { id: h.id, fraction: f < 0 ? 0 : f > 1 ? 1 : f }
  })
}
