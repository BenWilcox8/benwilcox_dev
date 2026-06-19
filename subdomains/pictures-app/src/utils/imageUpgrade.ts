// Pure policy for the gallery's progressive image upgrade. In-view tiles always
// upgrade thumb -> display; the idle prefetch of off-screen tiles backs off on
// data-saver / slow connections. The Network Information API shape is passed in
// so the decision is unit-testable without touching navigator.

export type ConnectionInfo = {
  saveData?: boolean
  effectiveType?: string
}

const SLOW_TYPES = new Set(['slow-2g', '2g'])

/** Should the idle pass prefetch display derivatives for off-screen tiles? */
export function shouldIdlePrefetch(connection: ConnectionInfo | undefined): boolean {
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && SLOW_TYPES.has(connection.effectiveType)) return false
  return true
}

/** Reads the Network Information API off navigator, if present. */
export function readConnection(): ConnectionInfo | undefined {
  if (typeof navigator === 'undefined') return undefined
  const conn = (navigator as Navigator & { connection?: ConnectionInfo }).connection
  return conn ?? undefined
}
