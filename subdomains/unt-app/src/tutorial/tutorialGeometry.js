// Placement maths for the tutorial layer.
//
// Every function here is pure and takes plain rectangles, so tooltip and arrow
// placement can be tested without a browser. A rectangle is
// `{ left, top, right, bottom, width, height }` in viewport coordinates, and a
// point is `{ x, y }`.

export const TOOLTIP_WIDTH = 260;

// How far diagonally the tooltip sits from the thing it describes. Close
// enough to read both without moving your eyes, far enough not to cover it.
export const TOOLTIP_GAP = 56;
export const VIEWPORT_MARGIN = 12;

// A tooltip beside a whole panel would sit a long way from the point that
// matters, so a large target is reduced to a patch around its middle and the
// arrow lands on that.
const MAX_ANCHOR_WIDTH = 220;
const MAX_ANCHOR_HEIGHT = 120;

const OVERLAP_ANCHOR_WEIGHT = 8;
const OVERLAP_SECTION_WEIGHT = 1;
const CLAMP_WEIGHT = 3;

// The current placement is kept unless another is clearly better, so the
// tooltip does not flip corners while a panel is being dragged.
const HYSTERESIS_RATIO = 1.2;
const HYSTERESIS_FLOOR = 3000;

export function makeRect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

export function viewportRect(viewport) {
  return makeRect(0, 0, viewport.width, viewport.height);
}

export function centreOf(rect) {
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
}

export function inflate(rect, by) {
  if (!rect) return null;
  return makeRect(rect.left - by, rect.top - by, rect.width + by * 2, rect.height + by * 2);
}

export function overlapArea(a, b) {
  if (!a || !b) return 0;
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

export function intersect(a, b) {
  if (!a || !b) return null;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return null;
  return makeRect(left, top, right - left, bottom - top);
}

// The patch the tooltip is placed around. It is centred on the target, and on
// the part of the target that is on screen when only part of it is, so the
// middle the arrow aims for is a middle the reader can see.
export function focusAnchor(targetRect, viewport) {
  const visible = intersect(targetRect, viewportRect(viewport)) || targetRect;
  const centre = centreOf(visible);
  const width = Math.min(visible.width, MAX_ANCHOR_WIDTH);
  const height = Math.min(visible.height, MAX_ANCHOR_HEIGHT);
  return makeRect(centre.x - width / 2, centre.y - height / 2, width, height);
}

export function clampToViewport(rect, viewport, margin = VIEWPORT_MARGIN) {
  const maxLeft = Math.max(margin, viewport.width - rect.width - margin);
  const maxTop = Math.max(margin, viewport.height - rect.height - margin);
  const left = Math.min(Math.max(rect.left, margin), maxLeft);
  const top = Math.min(Math.max(rect.top, margin), maxTop);
  return makeRect(left, top, rect.width, rect.height);
}

// The four corners a person would reach for, in the order they are preferred
// when nothing separates them.
export const DIAGONALS = [
  { key: 'below-right', x: 1, y: 1 },
  { key: 'above-right', x: 1, y: -1 },
  { key: 'below-left', x: -1, y: 1 },
  { key: 'above-left', x: -1, y: -1 },
];

export function diagonalRect(anchorRect, size, direction, gap = TOOLTIP_GAP) {
  const left = direction.x > 0 ? anchorRect.right + gap : anchorRect.left - gap - size.width;
  const top = direction.y > 0 ? anchorRect.bottom + gap : anchorRect.top - gap - size.height;
  return makeRect(left, top, size.width, size.height);
}

function movedBy(a, b) {
  return Math.abs(a.left - b.left) + Math.abs(a.top - b.top);
}

// Put the tooltip beside what it describes: diagonally off one corner of the
// focus point, whichever corner keeps it on screen and off the target.
export function chooseTooltipPlacement({ viewport, size, anchorRect, sectionRect, previousKey }) {
  const scored = DIAGONALS.map((direction) => {
    const wanted = diagonalRect(anchorRect, size, direction);
    const rect = clampToViewport(wanted, viewport);
    const score =
      OVERLAP_ANCHOR_WEIGHT * overlapArea(rect, inflate(anchorRect, 8)) +
      OVERLAP_SECTION_WEIGHT * overlapArea(rect, sectionRect) +
      CLAMP_WEIGHT * movedBy(rect, wanted) * 10;
    return { key: direction.key, rect, score };
  });

  const best = scored.reduce((a, b) => (b.score < a.score ? b : a));
  const previous = scored.find((candidate) => candidate.key === previousKey);
  if (previous && previous.score <= best.score * HYSTERESIS_RATIO + HYSTERESIS_FLOOR) {
    return previous;
  }
  return best;
}

// The point on a rectangle's border closest to `point`.
export function closestPointOnRect(rect, point) {
  const x = Math.min(Math.max(point.x, rect.left), rect.right);
  const y = Math.min(Math.max(point.y, rect.top), rect.bottom);

  // A point inside the rectangle clamps to itself, so push it out to whichever
  // edge is nearest.
  if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
    const toLeft = x - rect.left;
    const toRight = rect.right - x;
    const toTop = y - rect.top;
    const toBottom = rect.bottom - y;
    const nearest = Math.min(toLeft, toRight, toTop, toBottom);
    if (nearest === toLeft) return { x: rect.left, y };
    if (nearest === toRight) return { x: rect.right, y };
    if (nearest === toTop) return { x, y: rect.top };
    return { x, y: rect.bottom };
  }
  return { x, y };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function length(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function normalise(vector) {
  const size = length(vector);
  if (size === 0) return { x: 0, y: 0 };
  return { x: vector.x / size, y: vector.y / size };
}

const HEAD_LENGTH = 15;
const HEAD_SPREAD = 0.45; // radians either side of the shaft

// The tip aims at the middle of the target but pulls up just short of it, so
// whatever sits in the middle - a number in a semester bar, a word - is never
// under the arrowhead. Small targets get a smaller gap so the tip still lands
// inside them.
const STOP_SHORT_MIN = 10;
const STOP_SHORT_MAX = 22;
const STOP_SHORT_RATIO = 0.4;

export function stopShortDistance(anchorRect) {
  const smallest = Math.min(anchorRect.width, anchorRect.height);
  return Math.min(STOP_SHORT_MAX, Math.max(STOP_SHORT_MIN, smallest * STOP_SHORT_RATIO));
}

// A line drawn from the tooltip to the target, bowed a little so it reads as
// drawn rather than generated, aimed at the middle of the target. Centre mass,
// never an edge or a corner: the arrow names the thing itself, not the space
// beside it - but it stops a little short of the centre so it does not cover
// what is written there.
export function arrowGeometry(tooltipRect, anchorRect, { curve = 0.16 } = {}) {
  const centre = centreOf(anchorRect);
  const start = closestPointOnRect(tooltipRect, centre);

  const approach = normalise(subtract(centre, start));
  const short = stopShortDistance(anchorRect);
  const end = { x: centre.x - approach.x * short, y: centre.y - approach.y * short };

  const shaft = subtract(end, start);
  const span = length(shaft);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const perpendicular = { x: -shaft.y, y: shaft.x };
  const bow = normalise(perpendicular);
  const control = {
    x: mid.x + bow.x * curve * span,
    y: mid.y + bow.y * curve * span,
  };

  // The head follows the curve's direction where it lands, not the straight
  // line, so it always sits square on the arrow.
  const heading = normalise(subtract(end, control));
  const angle = Math.atan2(heading.y, heading.x);
  const head = [Math.PI - HEAD_SPREAD, Math.PI + HEAD_SPREAD].map((offset) => ({
    x: end.x + Math.cos(angle + offset) * HEAD_LENGTH,
    y: end.y + Math.sin(angle + offset) * HEAD_LENGTH,
  }));

  return {
    start,
    end,
    control,
    span,
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    headPath: `M ${head[0].x} ${head[0].y} L ${end.x} ${end.y} L ${head[1].x} ${head[1].y}`,
  };
}
