/**
 * Pure navigation helper for the detail page's "back to gallery" control.
 *
 * We want "back" to replicate native browser-back (which restores the gallery's
 * scroll position) whenever there is a prior in-app history entry to return to.
 * The browser History API exposes a monotonic per-entry index via
 * `window.history.state.idx`: it is 0 for the first entry in the session
 * (deep link, fresh page load, or refresh) and increments as entries are pushed.
 *
 * When there is no prior entry (idx 0, or no history state at all) we instead
 * navigate directly to the gallery route so the user always lands somewhere sane.
 */

/**
 * Decide whether "back to gallery" should pop one history entry or hard-navigate
 * to the gallery.
 *
 * @param historyIdx The current `window.history.state?.idx`, or null/undefined.
 * @returns 'back' when there is a prior in-app entry (idx > 0), otherwise 'gallery'.
 */
export function resolveBackTarget(
  historyIdx: number | null | undefined,
): 'gallery' | 'back' {
  if (historyIdx === null || historyIdx === undefined || historyIdx <= 0) {
    return 'gallery'
  }
  return 'back'
}
