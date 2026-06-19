export const DEV_MODE_KEY = 'picturesAppDevMode'

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/**
 * Resolve whether the gallery dev overlay is active. A `?dev` URL param wins and
 * is persisted (so the choice survives reloads after the param drops off);
 * otherwise the last persisted state is used. `?dev=0` explicitly forces it off.
 */
export function resolveDevMode(search: string, storage: StorageLike): boolean {
  const params = new URLSearchParams(search)
  if (params.has('dev')) {
    const raw = params.get('dev')
    const on = raw !== '0' && raw !== 'false'
    storage.setItem(DEV_MODE_KEY, on ? '1' : '0')
    return on
  }
  return storage.getItem(DEV_MODE_KEY) === '1'
}

/** Flip and persist the dev-mode flag, returning the new value. */
export function toggleDevMode(storage: StorageLike): boolean {
  const next = storage.getItem(DEV_MODE_KEY) !== '1'
  storage.setItem(DEV_MODE_KEY, next ? '1' : '0')
  return next
}
