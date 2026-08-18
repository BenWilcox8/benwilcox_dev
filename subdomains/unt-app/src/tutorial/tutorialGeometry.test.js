import {
  arrowPlacement,
  chooseArrowSide,
  chooseTooltipPlacement,
  makeRect,
  overlapArea,
  sideRoom,
} from './tutorialGeometry';

const viewport = { width: 1600, height: 900 };
const tooltip = { width: 340, height: 200 };

describe('overlapArea', () => {
  it('is zero for rectangles that do not touch', () => {
    expect(overlapArea(makeRect(0, 0, 10, 10), makeRect(20, 20, 10, 10))).toBe(0);
  });

  it('is the shared area for rectangles that cross', () => {
    expect(overlapArea(makeRect(0, 0, 20, 20), makeRect(10, 10, 20, 20))).toBe(100);
  });
});

describe('chooseTooltipPlacement', () => {
  it('keeps the tooltip inside the viewport', () => {
    const { rect } = chooseTooltipPlacement({
      viewport,
      size: tooltip,
      sectionRect: makeRect(0, 0, 800, 900),
      targetRect: makeRect(100, 100, 40, 20),
    });
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(viewport.width);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
  });

  it('stays off the focused section when there is room elsewhere', () => {
    const sectionRect = makeRect(0, 0, 700, 900);
    const { rect } = chooseTooltipPlacement({
      viewport,
      size: tooltip,
      sectionRect,
      targetRect: makeRect(100, 400, 40, 20),
    });
    expect(overlapArea(rect, sectionRect)).toBe(0);
  });

  it('stays off the arrow target', () => {
    const targetRect = makeRect(1400, 800, 60, 30);
    const { rect } = chooseTooltipPlacement({
      viewport,
      size: tooltip,
      sectionRect: makeRect(1100, 700, 480, 200),
      targetRect,
    });
    expect(overlapArea(rect, targetRect)).toBe(0);
  });

  it('keeps the previous placement while it is nearly as good', () => {
    const args = {
      viewport,
      size: tooltip,
      sectionRect: makeRect(0, 0, 700, 900),
      targetRect: makeRect(100, 400, 40, 20),
    };
    const first = chooseTooltipPlacement(args);
    const again = chooseTooltipPlacement({ ...args, previousKey: first.key });
    expect(again.key).toBe(first.key);
  });
});

describe('chooseArrowSide', () => {
  it('reports the room on each side', () => {
    expect(sideRoom(makeRect(100, 200, 50, 20), viewport)).toEqual({
      left: 100,
      right: 1450,
      top: 200,
      bottom: 680,
    });
  });

  it('prefers a sideways arrow when there is room for one', () => {
    expect(chooseArrowSide(makeRect(700, 100, 60, 20), viewport)).toBe('right');
  });

  it('uses the side a step asks for when there is room for it', () => {
    expect(chooseArrowSide(makeRect(700, 400, 60, 20), viewport, undefined, 'bottom')).toBe('bottom');
  });

  it('ignores a preferred side that does not fit', () => {
    const target = makeRect(700, 860, 60, 20);
    expect(chooseArrowSide(target, viewport, undefined, 'bottom')).not.toBe('bottom');
  });

  it('falls back to a vertical arrow when neither side fits', () => {
    const narrow = { width: 260, height: 900 };
    expect(['top', 'bottom']).toContain(chooseArrowSide(makeRect(60, 400, 140, 20), narrow));
  });
});

describe('arrowPlacement', () => {
  it('puts the arrow tip on the left edge of the target', () => {
    const target = makeRect(500, 300, 100, 40);
    const placement = arrowPlacement(target, 'left', { length: 96, gap: 10, thickness: 40 });
    // The arrow is drawn pointing right and rotated about its right edge, so
    // its right edge is the tip.
    expect(placement.left + placement.width).toBe(target.left - 10);
    expect(placement.rotation).toBe(0);
  });

  it('points back at the target from the other three sides', () => {
    const target = makeRect(500, 300, 100, 40);
    expect(arrowPlacement(target, 'right').rotation).toBe(180);
    expect(arrowPlacement(target, 'top').rotation).toBe(90);
    expect(arrowPlacement(target, 'bottom').rotation).toBe(270);
  });
});
