// First-visit memory.
//
// The key is versioned so a later rewrite of the tutorial can be shown again
// to people who already saw this one.
const SEEN_KEY = 'unt.tutorial.seen.v1';

export function hasSeenTutorial() {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // Private browsing modes can refuse localStorage. Treat that as "seen" so
    // the tutorial never replays on every page load.
    return true;
  }
}

export function markTutorialSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    // Nothing to do: the tutorial still runs, it just cannot be remembered.
  }
}

export function forgetTutorial() {
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    // Ignore.
  }
}
