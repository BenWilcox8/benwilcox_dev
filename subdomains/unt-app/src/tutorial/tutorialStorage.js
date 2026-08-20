// Whether this browser has seen the tutorial.
//
// The flag is stored in localStorage so it persists across soft reloads,
// hard reloads, and new tabs in the same browser. The tutorial auto-plays
// only when the flag is absent. It is marked seen when the tutorial starts.
//
// Incognito windows, cleared site data, and other browsers have no flag, so
// the tutorial auto-plays exactly once in each of those contexts.
//
// When localStorage is unavailable (blocked or private modes that throw), the
// module falls back to an in-memory flag for the life of the loaded page.
// That matches the old behavior and does not crash the app.
const LS_KEY = 'tutorial-seen';

let memoryFallback = false;

function lsAvailable() {
  try {
    localStorage.setItem('__ls_test__', '1');
    localStorage.removeItem('__ls_test__');
    return true;
  } catch {
    return false;
  }
}

export function hasSeenTutorial() {
  if (lsAvailable()) {
    return localStorage.getItem(LS_KEY) !== null;
  }
  return memoryFallback;
}

export function markTutorialSeen() {
  if (lsAvailable()) {
    localStorage.setItem(LS_KEY, '1');
  } else {
    memoryFallback = true;
  }
}

export function forgetTutorial() {
  if (lsAvailable()) {
    localStorage.removeItem(LS_KEY);
  }
  memoryFallback = false;
}
