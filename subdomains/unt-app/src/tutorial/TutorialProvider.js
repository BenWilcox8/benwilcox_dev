import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import useIsMobile from '../hooks/useIsMobile';
import { TutorialContext } from './TutorialContext';
import TutorialOverlay from './TutorialOverlay';
import { DECORATION_CLASSES, PARTS, SECTIONS } from './tutorialConfig';
import { isInertClick } from './tutorialDom';
import { hasSeenTutorial, markTutorialSeen } from './tutorialStorage';
import './Tutorial.css';

// The tutorial is desktop only. Below this width the app renders its mobile
// layout and the tutorial never mounts.
const MOBILE_BREAKPOINT = 900;

// How often the step list is re-checked against the page. A step whose subject
// is missing - a year column that no course in the timeline has - is dropped
// from the part and from the step total.
const AVAILABILITY_POLL_MS = 400;

// Text entry must keep working underneath the tutorial, so space and the arrow
// keys are left alone while the reader is typing.
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

// Unless a step says otherwise, only a click that leaves the app unchanged
// moves the tutorial on.
function defaultClickAdvances(ctx, element) {
  return isInertClick(element);
}

// Where to go from a step, in part order rather than in the order of what is
// still available. Both walks work off the part's full step list, so they
// answer for a step that has left the page between two beats of the poll as
// well as for one that is still there. `fallback` is what the caller wants
// when the part has nothing left in that direction.
function stepAfter(part, list, stepId, fallback) {
  const fullIndex = part.steps.findIndex((entry) => entry.id === stepId);
  if (fullIndex < 0) return list[0] || fallback;
  return list.find((entry) => part.steps.indexOf(entry) > fullIndex) || fallback;
}

function stepBefore(part, list, stepId, fallback) {
  const fullIndex = part.steps.findIndex((entry) => entry.id === stepId);
  if (fullIndex < 0) return fallback;
  const earlier = list.filter((entry) => part.steps.indexOf(entry) < fullIndex);
  return earlier[earlier.length - 1] || fallback;
}

function isTextEntry(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA') return true;
  if (element.tagName !== 'INPUT') return false;
  return TEXT_INPUT_TYPES.has((element.getAttribute('type') || 'text').toLowerCase());
}

export const TutorialProvider = ({ children }) => {
  const app = useContext(AppContext);
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);

  const [active, setActive] = useState(false);
  const [partIndex, setPartIndex] = useState(0);
  const [stepId, setStepId] = useState(null);
  const [, setPollCount] = useState(0);

  // Scratch space a step may write on entry and read while it is showing. It
  // is cleared whenever a step is entered, in either direction.
  const memoRef = useRef({});
  const autoStartedRef = useRef(false);
  const applyingRef = useRef(false);

  // What the step definitions see. It is written on every render so an event
  // handler always reads the current app state rather than a captured one.
  const ctxRef = useRef({});
  ctxRef.current = {
    coursesInDisplay1: app.coursesInDisplay1,
    activeCourse: app.activeCourse,
    filteredCourses: app.filteredCourses,
    granularView: app.granularView,
    showCourseCount: app.showCourseCount,
    showAllYears: app.showAllYears,
    setGranularView: app.setGranularView,
    setShowCourseCount: app.setShowCourseCount,
    setShowAllYears: app.setShowAllYears,
    memo: memoRef.current,
  };

  // Whether a step is available is read out of the live page, and reading it
  // costs a hit test per year column of the timeline. The answer can only
  // change as fast as the poll re-checks it, so it is worked out once per tick
  // and every render in between is served from here.
  const availabilityRef = useRef(new Map());

  // Re-render on a slow beat while the tutorial runs, so step availability
  // follows the page as the reader changes it.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      availabilityRef.current = new Map();
      setPollCount((count) => count + 1);
    }, AVAILABILITY_POLL_MS);
    return () => clearInterval(timer);
  }, [active]);

  const stepsOf = useCallback((index) => {
    const part = PARTS[index];
    if (!part) return [];
    const cached = availabilityRef.current.get(index);
    if (cached) return cached;
    const list = part.steps.filter((step) => !step.available || step.available(ctxRef.current));
    availabilityRef.current.set(index, list);
    return list;
  }, []);

  const part = PARTS[partIndex] || null;
  const steps = active ? stepsOf(partIndex) : [];
  const stepNumber = steps.findIndex((step) => step.id === stepId) + 1;
  const step = stepNumber > 0 ? steps[stepNumber - 1] : null;
  const gated = Boolean(active && part && part.gate && !part.gate.when(ctxRef.current));

  const exit = useCallback(() => {
    setActive(false);
    setStepId(null);
    memoRef.current = {};
  }, []);

  const start = useCallback(() => {
    memoRef.current = {};
    availabilityRef.current = new Map();
    setActive(true);
    setPartIndex(0);
    setStepId(stepsOf(0)[0]?.id || null);
    markTutorialSeen();
  }, [stepsOf]);

  const next = useCallback((options = {}) => {
    if (!active) return;
    const currentPart = PARTS[partIndex];
    if (!currentPart) return;
    // A part whose precondition is not met never advances past its gate.
    if (currentPart.gate && !currentPart.gate.when(ctxRef.current)) return;

    // Leaving a step leaves the app where the step would have left it, whether
    // the reader did the thing or pressed space. The tutorial may click the
    // page to do it, so its own click is fenced off from the click listener.
    const leaving = stepsOf(partIndex).find((entry) => entry.id === stepId);
    if (leaving && leaving.applyOnAdvance) {
      applyingRef.current = true;
      try {
        leaving.applyOnAdvance(ctxRef.current, { viaClick: Boolean(options.viaClick) });
      } finally {
        applyingRef.current = false;
      }
    }

    // Advancing means the next step of this part that is still there; the part
    // is only left behind when there is none.
    const replacement = stepAfter(currentPart, stepsOf(partIndex), stepId);
    if (replacement) {
      memoRef.current = {};
      setStepId(replacement.id);
      return;
    }

    const nextIndex = partIndex + 1;
    if (nextIndex >= PARTS.length) {
      exit();
      return;
    }
    memoRef.current = {};
    setPartIndex(nextIndex);
    setStepId(stepsOf(nextIndex)[0]?.id || null);
  }, [active, partIndex, stepId, stepsOf, exit]);

  const previous = useCallback(() => {
    if (!active) return;
    const currentPart = PARTS[partIndex];
    if (!currentPart) return;

    // Going back means the step of this part before this one that is still
    // there, whether or not this one is; the part is only left when there is
    // none.
    const replacement = stepBefore(currentPart, stepsOf(partIndex), stepId);
    if (replacement) {
      memoRef.current = {};
      setStepId(replacement.id);
      return;
    }
    if (partIndex === 0) return;
    const previousIndex = partIndex - 1;
    const previousList = stepsOf(previousIndex);
    memoRef.current = {};
    setPartIndex(previousIndex);
    setStepId(previousList[previousList.length - 1]?.id || null);
  }, [active, partIndex, stepId, stepsOf]);

  // A click inside the undarkened section counts as doing what the step asked
  // only when it does nothing to the app, or when the step named that exact
  // click. Clicking a semester bar, say, is the reader using the page, and the
  // page is not a 'next' button.
  const acceptSectionClick = useCallback(
    (element) => {
      if (!active || gated || !step) return;
      // A click the tutorial made itself, carrying out the step's own action.
      if (applyingRef.current) return;
      const rule = step.clickAdvances || defaultClickAdvances;
      if (!rule(ctxRef.current, element)) return;
      next({ viaClick: true });
    },
    [active, gated, step, next]
  );

  // Auto-play, once, on a first visit. The visit is recorded as the tutorial
  // starts, so a reload does not replay it. Data that failed to arrive leaves
  // a page with nothing to point at, so the tutorial stays away from it.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (isMobile || app.appLoading || app.dbError) return;
    autoStartedRef.current = true;
    if (hasSeenTutorial()) return;
    start();
  }, [isMobile, app.appLoading, app.dbError, start]);

  // The mobile layout has no tutorial, so a narrowing window ends it.
  useEffect(() => {
    if (isMobile && active) exit();
  }, [isMobile, active, exit]);

  // Keep the current step pointing at a step that still exists. This is what
  // makes a step that stops being available fall through to the next one, and
  // what picks up a step whose subject only appears once the page has drawn.
  useEffect(() => {
    if (!active || !part) return undefined;

    const repair = () => {
      const list = stepsOf(partIndex);
      if (list.length === 0) return;
      if (stepId && list.some((entry) => entry.id === stepId)) return;

      const replacement = stepAfter(part, list, stepId, list[list.length - 1]);
      memoRef.current = {};
      setStepId(replacement.id);
    };

    repair();
    const timer = setInterval(repair, AVAILABILITY_POLL_MS);
    return () => clearInterval(timer);
  }, [active, part, partIndex, stepId, stepsOf]);

  // Whatever the step changes in the app happens for real, and stays after the
  // tutorial ends.
  useEffect(() => {
    if (!active || !step) return;
    memoRef.current = {};
    ctxRef.current.memo = memoRef.current;
    if (step.onEnter) step.onEnter(ctxRef.current);
    // The step identity is the trigger: entering it again, forwards or
    // backwards, applies it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // Steps that watch the app rather than the keyboard.
  useEffect(() => {
    if (!active || gated || !step || !step.advanceWhen) return;
    if (step.advanceWhen(ctxRef.current)) next();
  });

  // While it runs, the page knows: the header keeps clear of the exit button.
  useEffect(() => {
    if (!active) return undefined;
    document.body.classList.add('tutorial-running');
    return () => document.body.classList.remove('tutorial-running');
  }, [active]);

  // Tutorial-only page decorations, such as naming every semester bar.
  useEffect(() => {
    if (!active || !step || !step.decorations) return undefined;
    const classes = step.decorations.map((name) => DECORATION_CLASSES[name]).filter(Boolean);
    classes.forEach((className) => document.body.classList.add(className));
    return () => classes.forEach((className) => document.body.classList.remove(className));
  }, [active, step]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        exit();
        return;
      }
      if (isTextEntry(event.target)) return;
      if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, exit, next, previous]);

  const value = useMemo(() => ({ active, restart: start }), [active, start]);

  // A gate may name a different section from the part it guards: it points at
  // wherever the missing thing has to be supplied.
  const gateSection = gated && part && part.gate.section;
  const focus =
    (typeof gateSection === 'function' ? gateSection(ctxRef.current) : gateSection) ||
    (part && part.section);

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {active && part && (
        <TutorialOverlay
          section={SECTIONS[focus]}
          step={gated ? part.gate : step}
          gated={gated}
          stepNumber={Math.max(stepNumber, 1)}
          // While a gate is up the page cannot say which steps will apply, so
          // the count shows the part in full rather than an undercount.
          stepTotal={gated ? part.steps.length : Math.max(steps.length, 1)}
          partTitle={part.title}
          isFirst={partIndex === 0 && stepNumber <= 1}
          isLast={partIndex === PARTS.length - 1 && stepNumber === steps.length}
          context={ctxRef}
          onNext={next}
          onPrevious={previous}
          onExit={exit}
          onSectionClick={acceptSectionClick}
        />
      )}
    </TutorialContext.Provider>
  );
};

export default TutorialProvider;
