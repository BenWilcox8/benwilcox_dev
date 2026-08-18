// Is a thing actually on screen?
//
// A year column of the timeline can sit well inside the window and still be
// invisible, because the timeline scrolls sideways inside its own panel. Every
// visibility question the tutorial asks therefore has to account for the
// scrolling boxes an element sits in, not only for the window.

const SCROLLING_OVERFLOW = /(auto|scroll|hidden|clip)/;

export function clipRectFor(element) {
  let clip = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  let parent = element.parentElement;

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    if (SCROLLING_OVERFLOW.test(style.overflowX) || SCROLLING_OVERFLOW.test(style.overflowY)) {
      const rect = parent.getBoundingClientRect();
      clip = {
        left: Math.max(clip.left, rect.left),
        top: Math.max(clip.top, rect.top),
        right: Math.min(clip.right, rect.right),
        bottom: Math.min(clip.bottom, rect.bottom),
      };
    }
    parent = parent.parentElement;
  }

  return clip;
}

export function visibleFraction(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0;
  const clip = clipRectFor(element);
  const width = Math.min(rect.right, clip.right) - Math.max(rect.left, clip.left);
  const height = Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top);
  if (width <= 0 || height <= 0) return 0;
  return (width * height) / (rect.width * rect.height);
}

export function isFullyVisible(element, padding = 2) {
  const rect = element.getBoundingClientRect();
  const clip = clipRectFor(element);
  return (
    rect.left >= clip.left - padding &&
    rect.top >= clip.top - padding &&
    rect.right <= clip.right + padding &&
    rect.bottom <= clip.bottom + padding
  );
}

// Something can be inside every box that clips it and still be hidden, because
// the timeline's course-name column is sticky and floats over the years that
// scroll under it. Hit testing the middle of the visible part settles it.
export function isUnobstructed(element) {
  const rect = element.getBoundingClientRect();
  const clip = clipRectFor(element);
  const left = Math.max(rect.left, clip.left);
  const right = Math.min(rect.right, clip.right);
  const top = Math.max(rect.top, clip.top);
  const bottom = Math.min(rect.bottom, clip.bottom);
  if (right <= left || bottom <= top) return false;

  const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
  if (!hit) return false;
  return element.contains(hit) || hit.contains(element);
}
