import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  TOOLTIP_WIDTH,
  arrowGeometry,
  chooseTooltipPlacement,
  focusAnchor,
  makeRect,
} from './tutorialGeometry';
import { isFullyVisible, isUnobstructed, visibleFraction } from './tutorialVisibility';

// The class the tutorial puts on the section in focus. The section is lifted
// above the dimming sheet by its own z-index, so the undarkened shape IS the
// real element: there is no measured box to lag behind a panel drag.
export const FOCUS_CLASS = 'tutorial-focus';

// Added as well for a section that brings no background of its own.
export const BACKDROP_CLASS = 'tutorial-focus-backdrop';

// How long after entering a step a fixed arrow keeps following its target.
// It covers the scroll-into-view animation, after which the arrow stays put
// until the window is resized.
const FREEZE_DELAY_MS = 600;

// How long the tutorial keeps looking for a target that is not in the page
// yet, for instance while the timeline is still drawing its first course.
const RESOLVE_RETRY_MS = 100;
const RESOLVE_ATTEMPTS = 40;

// How often the page is searched for the section and the arrow target.
const SEARCH_INTERVAL_MS = 120;

// A click that lands this soon after a drag is the end of the drag, not a
// click on the page.
const DRAG_SETTLE_MS = 250;

function viewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function toRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return makeRect(rect.left, rect.top, rect.width, rect.height);
}

function sameRect(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

const TutorialOverlay = ({
  section,
  step,
  gated,
  stepNumber,
  stepTotal,
  partTitle,
  isFirst,
  isLast,
  context,
  onNext,
  onPrevious,
  onExit,
  onSectionClick,
}) => {
  const [targetRect, setTargetRect] = useState(null);
  const [sectionRect, setSectionRect] = useState(null);
  const [viewport, setViewport] = useState(viewportSize);
  const [tooltipSize, setTooltipSize] = useState({ width: TOOLTIP_WIDTH, height: 160 });
  const [dragOffset, setDragOffset] = useState(null);

  const sectionElementRef = useRef(null);
  const targetElementRef = useRef(null);
  const sectionRectRef = useRef(null);
  const targetRectRef = useRef(null);
  const viewportRef = useRef(viewport);
  const frozenRectRef = useRef(null);
  const canFreezeRef = useRef(false);
  const tooltipRef = useRef(null);
  const placementKeyRef = useRef(null);
  const dragOffsetRef = useRef(null);
  const draggedAtRef = useRef(0);

  const resolveSection = useCallback(() => {
    if (!section) return null;
    const found = document.querySelector(section.selector);
    if (!found) return null;
    return section.wholePanel ? found.closest('.panel-content') || found : found;
  }, [section]);

  const resolveTarget = useCallback(() => {
    if (!step || typeof step.target !== 'function') return null;
    try {
      return step.target(context.current) || null;
    } catch {
      // A step must never break the page it is describing.
      return null;
    }
  }, [step, context]);

  // A tooltip the reader moved stays where they put it until the step changes,
  // at which point it goes back beside whatever the new step points at.
  useEffect(() => {
    dragOffsetRef.current = null;
    setDragOffset(null);
  }, [step]);

  // Bring an off-screen target into view, retrying while the page catches up
  // with whatever the step just changed.
  useEffect(() => {
    if (!step) return undefined;
    frozenRectRef.current = null;
    canFreezeRef.current = false;

    let cancelled = false;
    let attempts = 0;
    let timer = null;

    const attempt = () => {
      if (cancelled) return;
      const element = resolveTarget();
      if (element) {
        // 'nearest'/'center' scrolls every box the target sits in, which is
        // what brings a year column back from off the side of the timeline.
        if (!isFullyVisible(element) || !isUnobstructed(element)) {
          element.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
        timer = setTimeout(() => {
          canFreezeRef.current = true;
        }, FREEZE_DELAY_MS);
        return;
      }
      attempts += 1;
      if (attempts < RESOLVE_ATTEMPTS) timer = setTimeout(attempt, RESOLVE_RETRY_MS);
    };

    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [step, resolveTarget]);

  // A fixed arrow is measured again when the window changes size, and only
  // then, so it does not wander while the reader scrolls.
  useEffect(() => {
    const onResize = () => {
      frozenRectRef.current = null;
      canFreezeRef.current = false;
      setTimeout(() => {
        canFreezeRef.current = true;
      }, FREEZE_DELAY_MS);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Whatever the tutorial lit up goes back to normal when it ends.
  useEffect(() => {
    return () => {
      document.querySelectorAll('.' + FOCUS_CLASS).forEach((element) => {
        element.classList.remove(FOCUS_CLASS);
        element.classList.remove(BACKDROP_CLASS);
      });
    };
  }, []);

  // One measuring loop. It follows panel drags, scrolling and layout changes
  // without any component having to report them.
  //
  // Measuring a known element every frame is cheap; searching the page for it
  // is not, so the search runs on a slow beat and whenever the element it
  // found has left the document.
  useEffect(() => {
    let frame = null;
    let lastSearch = -Infinity;

    const measure = (timestamp) => {
      const detached =
        (sectionElementRef.current && !sectionElementRef.current.isConnected) ||
        (targetElementRef.current && !targetElementRef.current.isConnected);

      if (detached || timestamp - lastSearch > SEARCH_INTERVAL_MS) {
        lastSearch = timestamp;

        const sectionElement = resolveSection();
        sectionElementRef.current = sectionElement;
        // The section in focus is lifted out of the dark by a class on the
        // element itself, so the lit shape is the section, exactly, at every
        // moment of a panel drag. Re-applying costs nothing and survives a
        // re-render that replaced the node.
        document.querySelectorAll('.' + FOCUS_CLASS).forEach((element) => {
          if (element !== sectionElement) {
            element.classList.remove(FOCUS_CLASS);
            element.classList.remove(BACKDROP_CLASS);
          }
        });
        if (sectionElement) {
          sectionElement.classList.add(FOCUS_CLASS);
          sectionElement.classList.toggle(BACKDROP_CLASS, Boolean(section && section.backdrop));
        }

        const found = resolveTarget();
        // A target scrolled out of its own panel is not pointed at: the arrow
        // waits until the scroll above has brought it back.
        targetElementRef.current = found && visibleFraction(found) > 0.05 ? found : null;
      }

      const nextViewport = viewportSize();
      if (
        nextViewport.width !== viewportRef.current.width ||
        nextViewport.height !== viewportRef.current.height
      ) {
        viewportRef.current = nextViewport;
        setViewport(nextViewport);
      }

      const nextSectionRect = toRect(sectionElementRef.current);
      if (!sameRect(sectionRectRef.current, nextSectionRect)) {
        sectionRectRef.current = nextSectionRect;
        setSectionRect(nextSectionRect);
      }

      let nextTargetRect;
      if (step && step.staticTarget && frozenRectRef.current) {
        nextTargetRect = frozenRectRef.current;
      } else {
        nextTargetRect = toRect(targetElementRef.current);
        if (step && step.staticTarget && nextTargetRect && canFreezeRef.current) {
          frozenRectRef.current = nextTargetRect;
        }
      }
      if (!sameRect(targetRectRef.current, nextTargetRect)) {
        targetRectRef.current = nextTargetRect;
        setTargetRect(nextTargetRect);
      }

      frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [resolveSection, resolveTarget, section, step]);

  // The tooltip is placed from its own measured size, so a longer step moves
  // itself rather than running off the screen.
  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setTooltipSize((previous) =>
        Math.abs(previous.width - rect.width) > 1 || Math.abs(previous.height - rect.height) > 1
          ? { width: rect.width, height: rect.height }
          : previous
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Picking the tooltip up and putting it somewhere else. Nothing more: the
  // step, the page and what counts as an answer are all untouched by it.
  const onTooltipMouseDown = useCallback((event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button, a')) return;
    event.preventDefault();

    const start = { x: event.clientX, y: event.clientY };
    const base = dragOffsetRef.current || { x: 0, y: 0 };

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent) => {
      const offset = {
        x: base.x + moveEvent.clientX - start.x,
        y: base.y + moveEvent.clientY - start.y,
      };
      dragOffsetRef.current = offset;
      setDragOffset(offset);
      draggedAtRef.current = Date.now();
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = previousUserSelect;
      draggedAtRef.current = Date.now();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // A click on the recommended action counts as doing it. Clicks on the
  // tutorial's own furniture never do, and neither does a click that changes
  // something in the app unless this step asked for that exact click.
  //
  // The last step of the last part points at the header link that restarts the
  // tutorial. Clicking it restarts rather than ends, which is the link doing
  // its real job and what the step asks for: 'View the tutorial again'.
  useEffect(() => {
    const onClick = (event) => {
      const sectionElement = sectionElementRef.current;
      if (!sectionElement || !event.target || !event.target.closest) return;
      if (event.target.closest('.tutorial-layer')) return;
      if (event.target.closest('[data-tutorial-control]')) return;
      // Letting go of a dragged tooltip fires a click on whatever is under the
      // pointer. That is the drag ending, not a click on the page.
      if (Date.now() - draggedAtRef.current < DRAG_SETTLE_MS) return;
      // A step that is asking to be clicked takes its click from anywhere on
      // the screen, not only from inside the lit section. What each click is
      // allowed to mean is still the step's own business: a click that changes
      // something in the app only ever counts where the step named it.
      if (!step.wantsClick && !sectionElement.contains(event.target)) return;
      onSectionClick(event.target);
    };
    // Capture, so the step sees the app state as it was before the click.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [onSectionClick, step]);

  if (!step) return null;

  const text = typeof step.text === 'function' ? step.text(context.current) : step.text;
  const rawTitle = typeof step.title === 'function' ? step.title(context.current) : step.title;
  const title = rawTitle || partTitle;

  const anchorRect = targetRect ? focusAnchor(targetRect, viewport) : null;
  let tooltipRect;
  if (anchorRect) {
    const placement = chooseTooltipPlacement({
      viewport,
      size: tooltipSize,
      anchorRect,
      sectionRect,
      previousKey: placementKeyRef.current,
    });
    placementKeyRef.current = placement.key;
    tooltipRect = placement.rect;
  } else {
    // Nothing to point at: sit low and central, out of the way.
    tooltipRect = makeRect(
      Math.max(12, (viewport.width - tooltipSize.width) / 2),
      Math.max(12, viewport.height - tooltipSize.height - 56),
      tooltipSize.width,
      tooltipSize.height
    );
  }

  if (dragOffset) {
    tooltipRect = makeRect(
      tooltipRect.left + dragOffset.x,
      tooltipRect.top + dragOffset.y,
      tooltipRect.width,
      tooltipRect.height
    );
  }

  const arrow = anchorRect ? arrowGeometry(tooltipRect, anchorRect) : null;

  return (
    // The dimming sheet is a sibling of the tutorial's own furniture, not a
    // child: the section in focus is lifted between the two, so it stands out
    // of the dark while the tooltip and the arrow still draw over it.
    <>
      <div className="tutorial-dim" />
      <div className="tutorial-layer">
      <button
        className="tutorial-exit"
        onClick={onExit}
        aria-label="Exit tutorial"
        title="Exit tutorial (Esc)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5 L19 19 M19 5 L5 19" />
        </svg>
      </button>

      {arrow && arrow.span > 12 && (
        <svg
          className="tutorial-arrow-svg"
          width={viewport.width}
          height={viewport.height}
          aria-hidden="true"
        >
          <path className="tutorial-arrow-halo" d={arrow.path} />
          <path className="tutorial-arrow-halo" d={arrow.headPath} />
          <path className="tutorial-arrow-line" d={arrow.path} />
          <path className="tutorial-arrow-line" d={arrow.headPath} />
        </svg>
      )}

      <div
        className="tutorial-tooltip-wrap"
        ref={tooltipRef}
        style={{ left: tooltipRect.left + 'px', top: tooltipRect.top + 'px' }}
      >
        <div
          className={'tutorial-tooltip' + (gated ? ' tutorial-tooltip-blocked' : '')}
          role="dialog"
          aria-live="polite"
          onMouseDown={onTooltipMouseDown}
        >
          <div className="tutorial-part-title">
            {step.wantsClick && (
              // A step that is asking to be clicked says so before it is read.
              <svg className="tutorial-click-icon" viewBox="0 0 24 24" aria-label="Click" role="img">
                <path
                  className="tutorial-click-cursor"
                  d="M8.2 4.4 L8.2 16.2 L11.1 13.4 L13.2 18.4 L15.5 17.4 L13.4 12.5 L17.4 12.2 Z"
                />
                <path className="tutorial-click-spark" d="M4.4 5.6 L2.6 4.2 M6 2.6 L5.4 0.6 M9.9 2.7 L11 1" />
              </svg>
            )}
            {title}
          </div>
          <div className="tutorial-text">{text}</div>
          <div className="tutorial-actions">
            <button className="tutorial-button tutorial-back" onClick={onPrevious} disabled={isFirst}>
              &larr; Back
            </button>
            {/* A step that is asking to be clicked does not offer a button as
                well - the click is the point. Space and the right arrow still
                move it on, they are just not advertised here. */}
            {!step.wantsClick && (
              <button className="tutorial-button tutorial-next" onClick={onNext} disabled={gated}>
                {isLast ? 'Finish' : 'Next'} <span className="tutorial-key">(space)</span>
              </button>
            )}
          </div>
          {/* Why the Next button is dead. The keyboard hint that used to sit
              here is gone, but a blocked step still has to say so. */}
          {gated && <div className="tutorial-hint">Do the step above to go on.</div>}
        </div>
        <div className="tutorial-counter">
          {stepNumber}/{stepTotal}
        </div>
      </div>
      </div>
    </>
  );
};

export default TutorialOverlay;
