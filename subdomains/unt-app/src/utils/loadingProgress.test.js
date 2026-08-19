import {
  DOWNLOAD_CEILING,
  POST_DOWNLOAD_MS,
  downloadProgress,
  neverBackwards,
} from './loadingProgress';

describe('downloadProgress', () => {
  it('reports where the whole wait has got to, not where the download has', () => {
    // A real connection: 70s of download, then a fixed third of a second of
    // work. When the download lands, nearly all of the wait is behind us, and
    // the bar has to say so.
    // Held at the ceiling, which is as far as the download alone is allowed
    // to carry the bar.
    const realConnection = downloadProgress(100, 70000);
    expect(realConnection).toBe(DOWNLOAD_CEILING);

    // A local build: the same download in 388ms, the same work after it. Now
    // the download really is only about half the wait.
    const localBuild = downloadProgress(100, 388);
    expect(localBuild).toBeGreaterThan(50);
    expect(localBuild).toBeLessThan(65);
  });

  it('is never behind the real wait once the download lands', () => {
    // The reading the ticket forbids: showing less than has really elapsed.
    // Deliberately short-changing the work after the download is what keeps
    // the bar on the right side of this.
    [500, 2000, 10000, 70000].forEach((downloadMs) => {
      const realFraction = (downloadMs / (downloadMs + 355)) * 100;
      expect(downloadProgress(100, downloadMs)).toBeGreaterThanOrEqual(
        Math.min(realFraction, DOWNLOAD_CEILING)
      );
    });
  });

  it('leaves room for the work that follows, however slow the download was', () => {
    expect(downloadProgress(100, 600000)).toBeLessThanOrEqual(DOWNLOAD_CEILING);
  });

  it('starts at nothing and rises with the bytes', () => {
    expect(downloadProgress(0, 0)).toBe(0);
    const quarter = downloadProgress(25, 1000);
    const half = downloadProgress(50, 2000);
    expect(quarter).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(quarter);
  });

  it('treats a cached download as the near-nothing it is', () => {
    // Nothing was waited on, so almost the whole wait is still to come.
    expect(downloadProgress(100, 5)).toBeLessThan(5);
  });

  it('never runs past its own stage when more bytes arrive than were promised', () => {
    // A compressing proxy reports the packed length and delivers the unpacked
    // bytes, so the count can exceed the total.
    expect(downloadProgress(180, 1000)).toBeLessThanOrEqual(DOWNLOAD_CEILING);
    expect(downloadProgress(180, 1000)).toBe(downloadProgress(100, 1000));
  });

  it('reads a whole-percent report as the top of the point it stands for', () => {
    // 40 means "somewhere between 39.5 and 40.5", and the bar takes the top of
    // that rather than the bottom, so the rounding cannot push it behind.
    const topOfInterval = downloadProgress(40, 4000);
    const bottomOfInterval = (4000 / (4000 / 0.4 + POST_DOWNLOAD_MS)) * 100;
    expect(topOfInterval).toBeGreaterThan(bottomOfInterval);
    expect(topOfInterval).toBeLessThan(bottomOfInterval + 1);
  });

  it('copes with a missing or silly reading', () => {
    expect(downloadProgress(undefined, undefined)).toBe(0);
    expect(downloadProgress(-20, 1000)).toBe(0);
    expect(downloadProgress(50, -1)).toBe(0);
  });
});

describe('the work after the download', () => {
  it('is short-changed on purpose, so the bar sits ahead rather than behind', () => {
    expect(POST_DOWNLOAD_MS).toBeLessThan(355);
  });

  it('leaves the bar somewhere the reader can sit and look at it', () => {
    // It blocks the main thread, so whatever the download ends on is the frame
    // the reader watches until the app appears. That frame must be near the
    // end, not at whatever fraction the download happened to work out to.
    expect(DOWNLOAD_CEILING).toBeGreaterThanOrEqual(95);
    expect(DOWNLOAD_CEILING).toBeLessThan(100);
  });
});

describe('neverBackwards', () => {
  it('takes the later of the two', () => {
    expect(neverBackwards(50, 94)).toBe(94);
  });

  it('refuses to fall back', () => {
    // The defect this replaces: the download reported 50 and the stage after
    // it announced 10.
    expect(neverBackwards(50, 10)).toBe(50);
  });
});
