import { LOADING, downloadProgress, neverBackwards } from './loadingProgress';

describe('the loading bar weighting', () => {
  it('gives the download nearly all of the bar', () => {
    expect(LOADING.downloaded).toBeGreaterThanOrEqual(90);
    expect(LOADING.downloaded).toBeLessThan(100);
  });

  it('runs its stages in order and finishes at a hundred', () => {
    const stages = [
      LOADING.downloaded,
      LOADING.opened,
      LOADING.coursesLoaded,
      LOADING.catalogLoaded,
      LOADING.ready,
    ];
    stages.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(stages[index - 1]);
    });
    expect(LOADING.ready).toBe(100);
  });
});

describe('downloadProgress', () => {
  it('spans the download stage', () => {
    expect(downloadProgress(0)).toBe(0);
    expect(downloadProgress(100)).toBe(LOADING.downloaded);
    expect(downloadProgress(50)).toBeCloseTo(LOADING.downloaded / 2, 5);
  });

  it('never runs past its own stage when more bytes arrive than were promised', () => {
    // A compressing proxy reports the packed length and delivers the unpacked
    // bytes, so the count can exceed the total.
    expect(downloadProgress(180)).toBe(LOADING.downloaded);
  });

  it('copes with a missing or silly reading', () => {
    expect(downloadProgress(undefined)).toBe(0);
    expect(downloadProgress(-20)).toBe(0);
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
