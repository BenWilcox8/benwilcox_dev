// Placement maths for the tutorial layer.
//
// Every function here is pure and takes plain rectangles, so the tooltip and
// arrow placement can be tested without a browser. A rectangle is
// `{ left, top, right, bottom, width, height }` in viewport coordinates.

export const TOOLTIP_WIDTH = 340;
export const TOOLTIP_MARGIN = 24;
export const ARROW_LENGTH = 96;
export const ARROW_GAP = 10;

// How far around the arrow target the tooltip is kept clear. The arrow itself
// is drawn in this band, so a tooltip that lands inside it hides the arrow.
const TARGET_KEEP_CLEAR = 120;

const OVERLAP_TARGET_WEIGHT = 6;
const OVERLAP_SECTION_WEIGHT = 2;
const DISTANCE_WEIGHT = 0.2;

// The current placement is kept unless another one is clearly better. Without
// this the tooltip flips between corners while a panel is being dragged.
const HYSTERESIS_RATIO = 1.15;
const HYSTERESIS_FLOOR = 4000;

export function makeRect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
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

function centreDistance(a, b) {
  if (!a || !b) return 0;
  const dx = (a.left + a.right) / 2 - (b.left + b.right) / 2;
  const dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

// Nine anchor positions inside the viewport. The tooltip is never coupled to
// the page scroll, so it only ever sits at one of these.
export function tooltipCandidates(viewport, size, margin = TOOLTIP_MARGIN) {
  const maxLeft = Math.max(margin, viewport.width - size.width - margin);
  const maxTop = Math.max(margin, viewport.height - size.height - margin);
  const centreLeft = Math.min(maxLeft, Math.max(margin, (viewport.width - size.width) / 2));
  const centreTop = Math.min(maxTop, Math.max(margin, (viewport.height - size.height) / 2));

  const columns = [['left', margin], ['centre', centreLeft], ['right', maxLeft]];
  const rows = [['top', margin], ['middle', centreTop], ['bottom', maxTop]];

  const candidates = [];
  for (const [rowName, top] of rows) {
    for (const [columnName, left] of columns) {
      candidates.push({
        key: `${rowName}-${columnName}`,
        rect: makeRect(left, top, size.width, size.height),
      });
    }
  }
  return candidates;
}

// Picks the anchor that hides the least of the focused section and of the band
// around the arrow target, and among those the one closest to the target.
export function chooseTooltipPlacement({ viewport, size, sectionRect, targetRect, previousKey }) {
  const keepClear = inflate(targetRect, TARGET_KEEP_CLEAR);
  const candidates = tooltipCandidates(viewport, size);

  const scored = candidates.map((candidate) => {
    const score =
      OVERLAP_TARGET_WEIGHT * overlapArea(candidate.rect, keepClear) +
      OVERLAP_SECTION_WEIGHT * overlapArea(candidate.rect, sectionRect) +
      DISTANCE_WEIGHT * centreDistance(candidate.rect, targetRect || sectionRect);
    return { ...candidate, score };
  });

  const best = scored.reduce((a, b) => (b.score < a.score ? b : a));
  const previous = scored.find((candidate) => candidate.key === previousKey);
  if (previous && previous.score <= best.score * HYSTERESIS_RATIO + HYSTERESIS_FLOOR) {
    return previous;
  }
  return best;
}

// Room on each side of the target, inside the viewport.
export function sideRoom(targetRect, viewport) {
  return {
    left: targetRect.left,
    right: viewport.width - targetRect.right,
    top: targetRect.top,
    bottom: viewport.height - targetRect.bottom,
  };
}

// A horizontal arrow reads better than a vertical one: it names a row rather
// than a column, so it wins wherever there is room for it.
const SIDE_BIAS = { left: 200, right: 200, top: 0, bottom: 0 };
const SIDE_ORDER = ['left', 'right', 'top', 'bottom'];

// A step may name the side it wants - a header link is best pointed at from
// below, where there is nothing to draw over - and that side is used whenever
// it fits.
export function chooseArrowSide(targetRect, viewport, need = ARROW_LENGTH + ARROW_GAP, preferred) {
  const room = sideRoom(targetRect, viewport);
  if (preferred && room[preferred] >= need) return preferred;
  const fits = SIDE_ORDER.filter((side) => room[side] >= need);
  const pool = fits.length > 0 ? fits : SIDE_ORDER;
  return pool.reduce((best, side) =>
    room[side] + SIDE_BIAS[side] > room[best] + SIDE_BIAS[best] ? side : best
  );
}

// The arrow is drawn pointing right with its tip on the right edge of its box,
// then rotated about that tip so the tip lands on `anchor`.
const SIDE_ROTATION = { left: 0, right: 180, top: 90, bottom: 270 };

export function arrowPlacement(targetRect, side, { length = ARROW_LENGTH, gap = ARROW_GAP, thickness = 40 } = {}) {
  const centreX = (targetRect.left + targetRect.right) / 2;
  const centreY = (targetRect.top + targetRect.bottom) / 2;

  let anchorX;
  let anchorY;
  if (side === 'left') {
    anchorX = targetRect.left - gap;
    anchorY = centreY;
  } else if (side === 'right') {
    anchorX = targetRect.right + gap;
    anchorY = centreY;
  } else if (side === 'top') {
    anchorX = centreX;
    anchorY = targetRect.top - gap;
  } else {
    anchorX = centreX;
    anchorY = targetRect.bottom + gap;
  }

  return {
    left: anchorX - length,
    top: anchorY - thickness / 2,
    width: length,
    height: thickness,
    rotation: SIDE_ROTATION[side],
  };
}
