import React, { useCallback, useEffect, useRef } from 'react';

// One draggable handle that sets the width of the panel on its left.
//
// Course Display 1 and Course Display 2 each had their own copy of this. The
// copies shared four defects, all corrected here:
//
//  1. `mousemove` on `document` had no test for a held button, so a mouse-up
//     outside the window left the drag live and the bar followed the pointer.
//     Pointer capture and a `buttons` test end the drag in every case.
//  2. The handle position was a piecewise function of the width, so the handle
//     jumped away from the pointer at the snap threshold. `position` must now
//     be continuous, and a restore from the collapsed state tracks the pointer
//     with no dead band.
//  3. The width had no upper limit, so a long drag pushed the panel content
//     out of view. `maxWidth` clamps it.
//  4. A right-click started a drag. Only the primary button starts one now.
//
// The width one pointer position produces, given the state recorded at
// pointer-down. Pure, so the drag arithmetic can be tested on its own.
//
//   drag.startX          pointer x at pointer-down
//   drag.startWidth      width at pointer-down
//   drag.startedCollapsed  the panel was already collapsed
//   drag.maxWidth        upper limit for this drag
export const widthForPointer = (drag, clientX, snapThreshold) => {
  let next = drag.startWidth + (clientX - drag.startX);
  next = Math.max(0, Math.min(next, drag.maxWidth));
  // A drag that starts open collapses as soon as it crosses the threshold.
  // A drag that starts collapsed tracks the pointer from the first pixel, so
  // there is no band where the handle stands still.
  if (!drag.startedCollapsed && next < snapThreshold) next = 0;
  return next;
};

// The width a released drag settles on. A panel narrower than the threshold
// closes, so the resting widths stay 0 or at least `snapThreshold`.
export const widthOnRelease = (width, snapThreshold) =>
  (width > 0 && width < snapThreshold ? 0 : width);

// Props:
//   width          current width in px
//   setWidth       receives the new width
//   position       (width) => px for the `left` of the handle. Must be
//                  continuous, so that the handle tracks the pointer.
//   snapThreshold  a width below this collapses to 0 on release
//   getMaxWidth    () => px, measured once per drag
//   className      class of the handle element
const ResizeHandle = ({
  width,
  setWidth,
  position,
  snapThreshold = 30,
  getMaxWidth,
  className,
}) => {
  const handleRef = useRef(null);
  const dragRef = useRef(null);

  // The listeners are installed once. They read the live values through refs,
  // so a width change during a drag never re-installs them.
  const latest = useRef({ width, setWidth, snapThreshold, getMaxWidth });
  latest.current = { width, setWidth, snapThreshold, getMaxWidth };

  const endDrag = useCallback((snap) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    document.body.style.userSelect = drag.userSelect;
    document.body.style.cursor = drag.cursor;

    const handle = handleRef.current;
    if (handle && handle.hasPointerCapture && handle.hasPointerCapture(drag.pointerId)) {
      handle.releasePointerCapture(drag.pointerId);
    }

    if (!snap) return;
    const { setWidth: apply, snapThreshold: threshold } = latest.current;
    const settled = widthOnRelease(drag.lastWidth, threshold);
    if (settled !== drag.lastWidth) apply(settled);
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return undefined;

    const onPointerDown = (e) => {
      if (dragRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const { width: startWidth, getMaxWidth: measure } = latest.current;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startWidth,
        startedCollapsed: startWidth === 0,
        lastWidth: startWidth,
        maxWidth: measure ? measure() : Infinity,
        userSelect: document.body.style.userSelect,
        cursor: document.body.style.cursor,
      };

      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // Capture is unavailable; the document listeners below track the
        // drag on their own.
      }
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      // A mouse-up the page never saw leaves `buttons` at 0.
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        endDrag(true);
        return;
      }

      const { setWidth: apply, snapThreshold: threshold } = latest.current;
      const next = widthForPointer(drag, e.clientX, threshold);

      drag.lastWidth = next;
      apply(next);
      e.preventDefault();
    };

    const onPointerUp = (e) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      endDrag(true);
    };

    const onPointerCancel = (e) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      endDrag(true);
    };

    const onWindowBlur = () => endDrag(true);

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerCancel);
    handle.addEventListener('lostpointercapture', onPointerCancel);
    // A capture that never took hold still needs the drag tracked and ended.
    // When capture holds, these see the same events the handle listeners saw
    // and apply the same pure result, so the duplication is harmless.
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerCancel);
      handle.removeEventListener('lostpointercapture', onPointerCancel);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      endDrag(false);
    };
  }, [endDrag]);

  return <div ref={handleRef} className={className} style={{ left: `${position(width)}px` }} />;
};

export default ResizeHandle;
