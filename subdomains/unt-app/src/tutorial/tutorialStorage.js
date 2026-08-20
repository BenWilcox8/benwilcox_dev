// Whether this reader has already been shown the tutorial.
//
// The record is held in memory, for the life of the loaded page, and nothing
// is written to storage. That is what makes the tutorial behave the way the
// captain asked: it does not come back when the app moves between its own
// routes - going to Info/Data and back is the same loaded page, and the record
// is still there - but it does come back on a real page load, because a real
// page load is a new page with no record in it.
//
// The reasoning behind that choice, for the record: a stored flag answers "has
// this browser ever seen it", which is not the question. The question is "does
// this look like someone arriving", and arriving is exactly what a fresh page
// load is. Erring towards showing it costs a reader one Esc; erring the other
// way means a first-time reader who reloads never sees it at all.
let shownOnThisPage = false;

export function hasSeenTutorial() {
  return shownOnThisPage;
}

export function markTutorialSeen() {
  shownOnThisPage = true;
}

export function forgetTutorial() {
  shownOnThisPage = false;
}
