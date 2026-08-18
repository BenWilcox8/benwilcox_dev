import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ARROW_LENGTH,
  TOOLTIP_WIDTH,
  arrowPlacement,
  chooseArrowSide,
  chooseTooltipPlacement,
} from './tutorialGeometry';
import { isFullyVisible, isUnobstructed, visibleFraction } from './tutorialVisibility';

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

const ARROW_THICKNESS = 40;

function viewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function toRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
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
  const [sectionRect, setSectionRect] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipSize, setTooltipSize] = useState({ width: TOOLTIP_WIDTH, height: 180 });

  const sectionElementRef = useRef(null);
  const targetElementRef = useRef(null);
  const sectionRectRef = useRef(null);
  const targetRectRef = useRef(null);
  const frozenRectRef = useRef(null);
  const canFreezeRef = useRef(false);
  const tooltipRef = useRef(null);
  const placementKeyRef = useRef(null);

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

  // One measuring loop for both rectangles. It follows panel drags, scrolling
  // and layout changes without any component having to report them.
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
        sectionElementRef.current = resolveSection();
        const found = resolveTarget();
        // A target scrolled out of its own panel is not pointed at: the arrow
        // waits until the scroll above has brought it back.
        targetElementRef.current = found && visibleFraction(found) > 0.05 ? found : null;
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
  }, [resolveSection, resolveTarget, step]);

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

  // A click on the recommended action counts as doing it. Clicks on the
  // tutorial's own controls, and on the header link that restarts it, do not.
  //
  // The last step of the last part points at that header link, and clicking it
  // restarts the tutorial rather than ending it. That is the link doing its
  // real job, which the tutorial never overrides, and it is what the step asks
  // for: 'View the tutorial again'. Accepting the click here as well would end
  // the tutorial a moment before the restart began it again, so the reader
  // would see exactly the same thing.
  useEffect(() => {
    const onClick = (event) => {
      const sectionElement = sectionElementRef.current;
      if (!sectionElement || !event.target || !event.target.closest) return;
      if (event.target.closest('.tutorial-layer')) return;
      if (event.target.closest('[data-tutorial-control]')) return;
      if (!sectionElement.contains(event.target)) return;
      onSectionClick();
    };
    // Capture, so the step sees the app state as it was before the click.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [onSectionClick]);

  if (!step) return null;

  const text = typeof step.text === 'function' ? step.text(context.current) : step.text;

  const viewport = viewportSize();
  const placement = chooseTooltipPlacement({
    viewport,
    size: tooltipSize,
    sectionRect,
    targetRect,
    previousKey: placementKeyRef.current,
  });
  placementKeyRef.current = placement.key;

  let arrow = null;
  if (targetRect) {
    const side = chooseArrowSide(targetRect, viewport, undefined, step.arrowSide);
    arrow = arrowPlacement(targetRect, side, { length: ARROW_LENGTH, thickness: ARROW_THICKNESS });
  }

  return (
    <div className="tutorial-layer">
      {sectionRect ? (
        <div
          className="tutorial-spotlight"
          style={{
            left: `${sectionRect.left}px`,
            top: `${sectionRect.top}px`,
            width: `${sectionRect.width}px`,
            height: `${sectionRect.height}px`,
          }}
        />
      ) : (
        <div className="tutorial-spotlight tutorial-spotlight-none" />
      )}

      {arrow && (
        <div
          className="tutorial-arrow"
          style={{
            left: `${arrow.left}px`,
            top: `${arrow.top}px`,
            width: `${arrow.width}px`,
            height: `${arrow.height}px`,
            transform: `rotate(${arrow.rotation}deg)`,
          }}
        >
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <path className="tutorial-arrow-halo" d="M6 20 H84 M68 6 L94 20 L68 34" />
            <path className="tutorial-arrow-line" d="M6 20 H84 M68 6 L94 20 L68 34" />
          </svg>
        </div>
      )}

      <div
        className="tutorial-tooltip-wrap"
        ref={tooltipRef}
        style={{ left: `${placement.rect.left}px`, top: `${placement.rect.top}px` }}
      >
        <div className={`tutorial-tooltip${gated ? ' tutorial-tooltip-blocked' : ''}`} role="dialog" aria-live="polite">
          <button className="tutorial-close" onClick={onExit} aria-label="Exit tutorial" title="Exit tutorial (Esc)">
            &times;
          </button>
          <div className="tutorial-part-title">{partTitle}</div>
          <div className="tutorial-text">{text}</div>
          <div className="tutorial-actions">
            <button className="tutorial-button tutorial-back" onClick={onPrevious} disabled={isFirst}>
              &larr; Back
            </button>
            <button className="tutorial-button tutorial-next" onClick={onNext} disabled={gated}>
              {isLast ? 'Finish' : 'Next'} <span className="tutorial-key">(space)</span>
            </button>
          </div>
          <div className="tutorial-hint">
            {gated ? 'Do the step above to go on.' : 'Space or → next, ← back, Esc exits.'}
          </div>
        </div>
        <div className="tutorial-counter">
          {stepNumber}/{stepTotal}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
