import { useEffect, useState } from 'react'

/**
 * The single source of truth for the mobile-layout breakpoint. It MUST match the
 * `@media (max-width: 768px)` block in global.css so JavaScript and CSS never
 * disagree about which hero layout is active.
 */
export const MOBILE_MEDIA_QUERY = '(max-width: 768px)'

/**
 * Subscribe to a CSS media query and report whether it currently matches.
 *
 * Reads `window.matchMedia(query).matches` for the initial value and updates
 * whenever the match state flips (e.g. on viewport resize), so callers can
 * branch rendering in JavaScript off the exact same breakpoint the stylesheet
 * uses.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    // Re-sync immediately in case the query changed (or it flipped between the
    // initial render and effect commit).
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
