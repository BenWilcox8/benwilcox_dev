/**
 * Fraction of the page the user has scrolled through, clamped to [0, 1].
 *
 *   0 → scrolled to the very top
 *   1 → scrolled to the very bottom
 *
 * When the page is not taller than the viewport (`scrollHeight <= clientHeight`)
 * there is nothing to scroll, so progress is 0.
 *
 * @param scrollTop    Current vertical scroll offset (document.documentElement.scrollTop).
 * @param scrollHeight Total scrollable content height.
 * @param clientHeight Viewport height.
 */
export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const scrollable = scrollHeight - clientHeight
  if (scrollable <= 0) return 0
  const fraction = scrollTop / scrollable
  if (fraction < 0) return 0
  if (fraction > 1) return 1
  return fraction
}
