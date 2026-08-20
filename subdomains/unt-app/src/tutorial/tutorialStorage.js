// Whether this browser has seen the tutorial.
//
// The flag is stored in localStorage so it persists across soft reloads,
// hard reloads, and new tabs in the same browser. The tutorial auto-plays
// only when the flag is absent. It is marked seen when the tutorial starts.
//
// Incognito windows, cleared site data, and other browsers have no flag, so
// the tutorial auto-plays exactly once in each of those contexts.
//
// When localStorage is unavailable (blocked or private modes that throw), or
// when an access fails later (a full quota, a permission that is withdrawn),
// the module falls back to an in-memory flag for the life of the loaded page.
// That matches the old behavior and does not crash the app.
export const LS_KEY = 'tutorial-seen';

let memoryFallback = false;
let lsCached = null;

function lsAvailable() {
  if (lsCached !== null) return lsCached;
  try {
    localStorage.setItem('__ls_test__', '1');
    localStorage.removeItem('__ls_test__');
    lsCached = true;
  } catch {
    lsCached = false;
  }
  return lsCached;
}

export function hasSeenTutorial() {
  if (memoryFallback) return true;
  if (lsAvailable()) {
    try {
      return localStorage.getItem(LS_KEY) !== null;
    } catch {
      lsCached = false;
    }
  }
  return memoryFallback;
}

export function markTutorialSeen() {
  if (lsAvailable()) {
    try {
      localStorage.setItem(LS_KEY, '1');
      return;
    } catch {
      lsCached = false;
    }
  }
  memoryFallback = true;
}

export function forgetTutorial() {
  memoryFallback = false;
  lsCached = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    lsCached = false;
  }
}
