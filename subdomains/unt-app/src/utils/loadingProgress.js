// How far along the loading bar each part of the wait leaves it.
//
// The parts are not equal and they do not scale together. The database is
// 87MB, so on any real connection the download is nearly the whole wait -
// around seventy seconds against a third of a second for everything after it -
// while on a local build it is about half of a wait of one second. The work
// after it is processor-bound and takes much the same time either way.
//
// Weighting the download at most of the bar is therefore close to exact on a
// real connection, and reads a little ahead of itself on a fast one. Ahead is
// the direction to be wrong in: a reader who sees 94% and waits a moment is
// better served than one who sees 50% and is already nearly done.
//
// Measured on a local build: download 388ms, open 57ms, courses 96ms,
// catalog 159ms, search index 43ms.
export const LOADING = {
  downloaded: 94,
  opened: 95,
  coursesLoaded: 96,
  catalogLoaded: 99,
  ready: 100,
};

// Where the bar sits part way through the download.
//
// The share is held at one because a proxy that compresses the file reports
// fewer bytes in Content-Length than actually arrive, which would otherwise
// carry the bar past the end of its own stage.
export function downloadProgress(percentReceived) {
  const share = Math.min(1, Math.max(0, (percentReceived || 0) / 100));
  return share * LOADING.downloaded;
}

// The bar only ever moves forward. A stage that finishes sooner than the one
// before it cannot pull it backwards, which is what used to happen when the
// download reported half the bar and the next stage announced a tenth of it.
export function neverBackwards(current, next) {
  return Math.max(current, next);
}
