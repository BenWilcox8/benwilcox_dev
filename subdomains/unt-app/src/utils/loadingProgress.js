// Where the loading bar should be, at any moment of the wait.
//
// The wait has two halves that behave nothing alike.
//
// The first is the download. The database is 87MB, so it takes about seventy
// seconds on a real connection, a second or two on a local build, and no time
// at all when the browser has it cached. No fixed share of the bar can be
// right for all three: a share tuned for a real connection reads far ahead on
// a local build, and one tuned for a local build reads far behind on a real
// connection - and behind is the direction this must never be. So the bar
// projects instead. It knows how much of the file has arrived and how long
// that has taken, so it can say how long the whole download will take, add the
// cost of the work that follows, and report the fraction of that total which
// has really gone by.
//
// The second half is opening the file, reading the courses, reading the
// catalog and building the search index. Measured against a real load, that
// work blocks the main thread solid - a sampler running every 25ms recorded
// nothing at all for 671ms across it. Nothing can be painted while it runs, so
// no progress reported during it will ever be seen: whatever the bar says when
// the download lands is the frame the reader looks at until the app appears.
//
// That settles what to do at the end of the download: put the bar as far along
// as it is allowed to go. The reader then waits out the blocked stretch
// looking at 99% rather than at whatever fraction the download happened to
// work out to, which is both kinder and the erring-complete direction the
// ticket asks for.
//
// What this comes to, driven against a throttled connection: the download ran
// 168s, the bar rose smoothly from 0 to 99 over it, and the blocked stretch
// after it lasted 461ms with the bar sitting at 99 throughout. Across the
// whole wait the bar stayed within about three points of the fraction of real
// time that had passed. It is a byte count underneath, so a download that
// slows towards its end leaves the bar a little behind for the last second or
// so - the residual the projection cannot remove, since nothing in the page
// knows the rate the rest of the file will arrive at.

// The work after the download, measured on a local build: opening 57ms,
// courses 96ms, catalog 159ms, search index 43ms. The figure used here is
// deliberately short of that, which makes the projected total short, which
// leaves the bar a little ahead of itself while the download runs.
export const POST_DOWNLOAD_MS = 300;

// The download never fills the bar: there is always work after it, and a full
// bar over an unusable page is the one reading the ticket rules out.
export const DOWNLOAD_CEILING = 99;

function clampShare(value) {
  return Math.min(1, Math.max(0, value || 0));
}

// The fetch reports whole percents, so a reading of 40 means the true share is
// somewhere within half a point either side of it. The top of that interval is
// the one used: erring ahead is the direction asked for, and it is free.
const REPORTED_ROUNDING = 0.5;

// Part way through the download. `percentReceived` is what the fetch reports;
// `elapsedMs` is how long the wait has run so far.
//
// The share is held at one because a proxy that compresses the file reports
// fewer bytes in Content-Length than actually arrive.
export function downloadProgress(percentReceived, elapsedMs) {
  const reported = Math.max(0, percentReceived || 0);
  if (reported <= 0) return 0;
  const share = clampShare((reported + REPORTED_ROUNDING) / 100);

  const elapsed = Math.max(0, elapsedMs || 0);
  const projectedDownloadMs = elapsed / share;
  const projectedTotalMs = projectedDownloadMs + POST_DOWNLOAD_MS;
  if (projectedTotalMs <= 0) return 0;

  return Math.min((elapsed / projectedTotalMs) * 100, DOWNLOAD_CEILING);
}

// The bar only ever moves forward. A stage that finishes sooner than the one
// before it cannot pull it backwards, which is what used to happen when the
// download reported half the bar and the next stage announced a tenth of it.
export function neverBackwards(current, next) {
  return Math.max(current, next);
}
