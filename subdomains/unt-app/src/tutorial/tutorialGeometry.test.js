import {
  arrowGeometry,
  centreOf,
  chooseTooltipPlacement,
  clampToViewport,
  closestPointOnRect,
  diagonalRect,
  focusAnchor,
  intersect,
  makeRect,
  overlapArea,
} from './tutorialGeometry';

const viewport = { width: 1600, height: 900 };
const tooltip = { width: 260, height: 170 };

describe('overlapArea and intersect', () => {
  it('is zero for rectangles that do not touch', () => {
    expect(overlapArea(makeRect(0, 0, 10, 10), makeRect(20, 20, 10, 10))).toBe(0);
    expect(intersect(makeRect(0, 0, 10, 10), makeRect(20, 20, 10, 10))).toBeNull();
  });

  it('is the shared area for rectangles that cross', () => {
    expect(overlapArea(makeRect(0, 0, 20, 20), makeRect(10, 10, 20, 20))).toBe(100);
  });
});

describe('focusAnchor', () => {
  it('leaves a small target alone', () => {
    const bar = makeRect(500, 300, 110, 20);
    expect(focusAnchor(bar, viewport)).toEqual(bar);
  });

  it('reduces a whole panel to a patch around its middle', () => {
    const panel = makeRect(100, 100, 900, 600);
    const anchor = focusAnchor(panel, viewport);
    expect(anchor.width).toBeLessThanOrEqual(220);
    expect(anchor.height).toBeLessThanOrEqual(120);
    expect(centreOf(anchor)).toEqual(centreOf(panel));
  });

  it('measures only the part of the target that is on screen', () => {
    const halfOff = makeRect(-400, 300, 600, 40);
    const anchor = focusAnchor(halfOff, viewport);
    expect(anchor.left).toBeGreaterThanOrEqual(0);
  });
});

describe('clampToViewport', () => {
  it('pulls a rectangle back on screen', () => {
    const rect = clampToViewport(makeRect(1550, 880, 260, 170), viewport);
    expect(rect.right).toBeLessThanOrEqual(viewport.width);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  });
});

describe('diagonalRect', () => {
  it('sits off the corner it is asked for', () => {
    const anchor = makeRect(500, 300, 100, 40);
    const belowRight = diagonalRect(anchor, tooltip, { x: 1, y: 1 }, 20);
    expect(belowRight.left).toBe(anchor.right + 20);
    expect(belowRight.top).toBe(anchor.bottom + 20);

    const aboveLeft = diagonalRect(anchor, tooltip, { x: -1, y: -1 }, 20);
    expect(aboveLeft.right).toBe(anchor.left - 20);
    expect(aboveLeft.bottom).toBe(anchor.top - 20);
  });
});

describe('chooseTooltipPlacement', () => {
  const anchorRect = makeRect(700, 400, 120, 40);

  it('puts the tooltip beside the thing it describes, not across the screen', () => {
    const { rect } = chooseTooltipPlacement({ viewport, size: tooltip, anchorRect });
    const gap = Math.min(
      Math.abs(rect.left - anchorRect.right),
      Math.abs(anchorRect.left - rect.right)
    );
    expect(gap).toBeLessThan(60);
  });

  it('never covers the thing it describes', () => {
    const { rect } = chooseTooltipPlacement({ viewport, size: tooltip, anchorRect });
    expect(overlapArea(rect, anchorRect)).toBe(0);
  });

  it('keeps the tooltip on screen for a target in the far corner', () => {
    const corner = makeRect(1560, 860, 30, 30);
    const { rect } = chooseTooltipPlacement({ viewport, size: tooltip, anchorRect: corner });
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(viewport.width);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
  });

  it('keeps the placement it already had while it is nearly as good', () => {
    const args = { viewport, size: tooltip, anchorRect };
    const first = chooseTooltipPlacement(args);
    const again = chooseTooltipPlacement({ ...args, previousKey: first.key });
    expect(again.key).toBe(first.key);
  });
});

describe('closestPointOnRect', () => {
  it('is the nearest border point for an outside point', () => {
    expect(closestPointOnRect(makeRect(100, 100, 100, 100), { x: 50, y: 150 })).toEqual({
      x: 100,
      y: 150,
    });
  });

  it('pushes an inside point out to its nearest edge', () => {
    const point = closestPointOnRect(makeRect(100, 100, 100, 100), { x: 110, y: 150 });
    expect(point).toEqual({ x: 100, y: 150 });
  });
});

describe('arrowGeometry', () => {
  const anchorRect = makeRect(700, 400, 120, 40);
  const tooltipRect = makeRect(300, 150, 260, 170);

  it('starts on the tooltip and lands on the middle of the target', () => {
    const { start, end } = arrowGeometry(tooltipRect, anchorRect);
    // the start sits on the tooltip's border
    const onTooltipBorder =
      Math.abs(start.x - tooltipRect.right) < 1 ||
      Math.abs(start.x - tooltipRect.left) < 1 ||
      Math.abs(start.y - tooltipRect.bottom) < 1 ||
      Math.abs(start.y - tooltipRect.top) < 1;
    expect(onTooltipBorder).toBe(true);
    // centre mass, never an edge or a corner
    expect(end).toEqual(centreOf(anchorRect));
  });

  it('lands on the middle from whichever side the tooltip sits', () => {
    const sides = [
      makeRect(300, 150, 260, 170),
      makeRect(1000, 150, 260, 170),
      makeRect(300, 600, 260, 170),
      makeRect(1000, 600, 260, 170),
    ];
    sides.forEach((rect) => {
      expect(arrowGeometry(rect, anchorRect).end).toEqual(centreOf(anchorRect));
    });
  });

  it('runs diagonally when the tooltip sits off a corner', () => {
    const { start, end } = arrowGeometry(tooltipRect, anchorRect);
    expect(Math.abs(end.x - start.x)).toBeGreaterThan(20);
    expect(Math.abs(end.y - start.y)).toBeGreaterThan(20);
  });

  it('bows the line rather than drawing it straight', () => {
    const { start, end, control } = arrowGeometry(tooltipRect, anchorRect);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const bow = Math.hypot(control.x - midX, control.y - midY);
    expect(bow).toBeGreaterThan(4);
  });

  it('draws a head at the target end', () => {
    const { headPath, end } = arrowGeometry(tooltipRect, anchorRect);
    expect(headPath).toContain(`L ${end.x} ${end.y} L`);
  });
});
