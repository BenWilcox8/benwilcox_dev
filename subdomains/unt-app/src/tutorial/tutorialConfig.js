import React from 'react';
import {
  catalogEntryLink,
  courseCellLink,
  courseCountToggle,
  courseDescription,
  hasCourseCell,
  hasYearColumn,
  isCourseCountToggleClick,
  isFilledSemesterBarClick,
  isInertClick,
  isLinkClick,
  headerInfoLink,
  headerShareButton,
  headerSupportLink,
  headerTutorialLink,
  nthCourseItem,
  preferredFilledSemesterBar,
  preferredFilledSemesterCount,
  topLeftSemesterBar,
  yearColumnCell,
  yearsSpecifierHeader,
} from './tutorialDom';

// The whole tutorial, as data.
//
// A part names the section that stays undarkened and lists its steps. Adding a
// part is adding an entry to PARTS: the engine in TutorialProvider reads these
// fields and nothing else, so no framework change is needed for a new part.
//
// Section fields:
//   selector   what to look for in the page
//   wholePanel expand the match to the resizable panel that holds it
//   backdrop   the section has no background of its own, so give it one while
//              it is lit: without it the section reads as text in the dark
//
// Part fields:
//   id         stable name, used for keys and for the header restart
//   section    key into SECTIONS: the only part of the page left undarkened
//   gate       optional { when, text, target, section }. While `when` is false
//              the part shows the gate instead of its steps and refuses to
//              advance, which is how an empty or skipped-past state is handled
//   steps      the steps, in order
//
// Step fields:
//   id          stable name
//   title       what the tooltip is headed with: the name of the exact thing
//               the step is about, not the name of the section it sits in
//   text        the instruction: plain text, JSX, or a function of the app
//               state that returns either
//   wantsClick  the step is asking for a click, so the tooltip shows a click
//               icon
//   applyOnAdvance (ctx, { viaClick }) => void - the step's own action, which
//               the tutorial performs itself when the reader moves on without
//               doing it, so the example workflow holds either way
//   target      (ctx) => Element | null - what the arrow points at
//   staticTarget the arrow position is measured once and then only on resize
//   available   (ctx) => boolean - false means the step is never shown and
//               never counted in the step total
//   onEnter     (ctx) => void - a real change to the app, applied on entry in
//               either direction. Anything it does persists after the tutorial
//   decorations names of tutorial-only page decorations to apply on this step
//   clickAdvances (ctx, element) => boolean - whether a click inside the
//               focused section advances. It defaults to "only a click that
//               does nothing to the app": a click that really changes
//               something advances only where the step says so below
//   advanceWhen (ctx) => boolean - advance as soon as this becomes true
//
// A gate takes the same `text`, `target` and `section` fields, and each of them
// may be a function of the app state, so one gate can name whichever of its
// preconditions is the missing one.

export const SECTIONS = {
  courseSelector: { selector: '.course-selector-container', wholePanel: true },
  display1: { selector: '.course-display1-wrapper', wholePanel: true },
  display2: { selector: '.course-display2-wrapper', wholePanel: true },
  courseDetails: { selector: '.course-details-container', wholePanel: true },
  header: { selector: '.header-container', wholePanel: false, backdrop: true },
};

// Decoration names a step may ask for. The overlay puts the matching class on
// <body> while the step is showing and takes it off again when the step ends.
export const DECORATION_CLASSES = {
  semesterNames: 'tutorial-semester-names',
};

// What every step that points at a link accepts. The step names this click:
// following the link. Cmd-click included, and the link keeps doing its own job
// either way. One rule, so a change to what counts as following a link cannot
// reach some of these steps and miss the rest.
const followsTheLink = (ctx, element) => isLinkClick(element) || isInertClick(element);

// Which course down the list the opening arrow points at.
export const DEFAULT_COURSE_POSITION = 4;

const SELECT_A_COURSE = {
  text: 'Select a course. Click any course in the list to put it on the timeline.',
  target: () => nthCourseItem(DEFAULT_COURSE_POSITION),
};

// Everything after part 2 needs a course on the timeline and a selected one.
// This says which of the two is missing, or nothing when both are there.
function courseSelectionProblem(ctx) {
  if (ctx.coursesInDisplay1.length === 0) return 'empty-timeline';
  if (!ctx.activeCourse) return 'no-selection';
  return null;
}

const SELECTION_GATE_TITLE = {
  'empty-timeline': 'Course List',
  'no-selection': 'Timeline',
};

const SELECTION_GATE_SECTION = {
  'empty-timeline': 'courseSelector',
  'no-selection': 'display1',
};

const SELECTION_GATE_TEXT = {
  'empty-timeline': 'The timeline is empty. Select a course in the course selector to go on.',
  'no-selection':
    'No course is selected. Click a course on the timeline, or one of its semester bars.',
};

function selectionGateTarget(problem) {
  if (problem === 'empty-timeline') return nthCourseItem(DEFAULT_COURSE_POSITION);
  return preferredFilledSemesterBar() || topLeftSemesterBar();
}

export const PARTS = [
  {
    id: 'course-selector',
    title: 'Course selector',
    section: 'courseSelector',
    steps: [
      {
        id: 'select-a-course',
        title: 'Course List',
        wantsClick: true,
        text: SELECT_A_COURSE.text,
        target: SELECT_A_COURSE.target,
        staticTarget: true,
        // Picking a course is a real action, and advanceWhen below is what
        // notices it. A click never advances this step by itself.
        clickAdvances: () => false,
        onEnter: (ctx) => {
          ctx.memo.alreadyAdded = new Set(ctx.coursesInDisplay1.map((c) => c.main_course_id));
        },
        advanceWhen: (ctx) =>
          ctx.coursesInDisplay1.some(
            (c) => !(ctx.memo.alreadyAdded || new Set()).has(c.main_course_id)
          ),
      },
    ],
  },

  {
    id: 'course-display-1',
    title: 'Course display 1',
    section: 'display1',
    gate: {
      when: (ctx) => ctx.coursesInDisplay1.length > 0,
      section: 'courseSelector',
      title: 'Course List',
      wantsClick: true,
      text: 'The timeline is empty. Select a course in the course selector to go on.',
      target: SELECT_A_COURSE.target,
    },
    steps: [
      {
        id: 'semester-bars',
        title: 'Semester Bar',
        text: 'Each bar on the timeline shows a semester that this course was offered.',
        target: topLeftSemesterBar,
        onEnter: (ctx) => {
          ctx.setGranularView(false);
          ctx.setShowCourseCount(false);
        },
      },
      {
        id: 'broad-semesters',
        title: 'Broad Semesters',
        text: 'Each year has Fall, Summer, Spring, Winter.',
        target: topLeftSemesterBar,
        decorations: ['semesterNames'],
      },
      {
        id: 'filled-bars',
        title: 'Filled Bar',
        text: 'A filled-in bar means that a professor actually taught this class during this year and semester.',
        target: preferredFilledSemesterBar,
      },
      {
        id: 'course-count-toggle',
        title: 'Course Count Toggle',
        wantsClick: true,
        text: (
          <>
            Turn on <strong>"Course Count"</strong>.
          </>
        ),
        target: courseCountToggle,
        // The step names this click, and switching the toggle on is the whole
        // of it, so that click moves the reader on to see what it did.
        clickAdvances: (ctx, element) =>
          isCourseCountToggleClick(element) || isInertClick(element),
        // However the reader leaves this step, Course Count ends up on: the
        // step after it is about the number this puts in the bar.
        applyOnAdvance: (ctx) => ctx.setShowCourseCount(true),
      },
      {
        id: 'course-count-number',
        title: 'Course Count',
        text: (
          <>
            <strong>"Course Count"</strong> displays the number of class sections in a given semester.
          </>
        ),
        // By now the toggle is on, whichever way the reader left the step
        // before, so there is a number in the bar to point at.
        target: preferredFilledSemesterCount,
      },
      {
        id: 'listed-years',
        title: 'Listed Year',
        text: (
          <>
            Every year, UNT publishes a{' '}
            <a href="https://catalog.unt.edu/index.php" target="_blank" rel="noopener noreferrer">
              Course Catalog
            </a>
            . A light background means that this course was listed during that year.
          </>
        ),
        target: () => yearColumnCell('listed'),
        available: () => hasYearColumn('listed'),
      },
      {
        id: 'unlisted-years',
        title: 'Unlisted Year',
        text: 'A dark-gray background means that this course was not listed during this year.',
        target: () => yearColumnCell('unlisted'),
        available: () => hasYearColumn('unlisted'),
      },
      {
        id: 'pre-2011-years',
        title: 'Years Before 2011',
        text: 'Years before 2011 are colored light-gray because the catalog was only introduced in 2011.',
        target: () => yearColumnCell('pre-2011'),
        available: () => hasYearColumn('pre-2011'),
      },
      {
        id: 'open-a-semester',
        title: 'Semester Sections',
        wantsClick: true,
        text: "Click a semester for that year's sections and professors.",
        // Any bar is a semester the reader can open, so a course that was never
        // taught still gets an arrow.
        target: () => preferredFilledSemesterBar() || topLeftSemesterBar(),
        // The step names this click: opening a filled semester.
        clickAdvances: (ctx, element) =>
          isFilledSemesterBarClick(element) || isInertClick(element),
        // Moving on without opening one opens the bar the arrow points at, by
        // clicking it exactly as the reader would have, so course display 2
        // has the sections the next part talks about. A reader who opened
        // their own semester keeps it.
        applyOnAdvance: (ctx, { viaClick }) => {
          if (viaClick) return;
          const bar = preferredFilledSemesterBar();
          if (bar) bar.click();
        },
      },
    ],
  },

  {
    id: 'course-display-2',
    title: 'Course display 2',
    section: 'display2',
    gate: {
      when: (ctx) => Boolean(ctx.activeCourse) && hasCourseCell(),
      section: (ctx) => SELECTION_GATE_SECTION[courseSelectionProblem(ctx)] || 'display2',
      title: (ctx) => SELECTION_GATE_TITLE[courseSelectionProblem(ctx)] || 'Years and Semesters',
      wantsClick: true,
      text: (ctx) =>
        SELECTION_GATE_TEXT[courseSelectionProblem(ctx)] ||
        'No sections are showing. Tick a year and a semester so that at least one appears.',
      target: (ctx) => {
        const problem = courseSelectionProblem(ctx);
        return problem ? selectionGateTarget(problem) : yearsSpecifierHeader();
      },
    },
    steps: [
      {
        id: 'pick-years-and-semesters',
        title: 'Years and Semesters',
        text: 'Select specific years/semesters to look at.',
        target: yearsSpecifierHeader,
        // Ticking years and semesters takes several clicks, so only the
        // keyboard moves this step on.
        clickAdvances: () => false,
      },
      {
        id: 'course-cells',
        title: 'Course Section',
        wantsClick: true,
        text: 'Each box is a real course section. Links go to the real source.',
        target: courseCellLink,
        clickAdvances: followsTheLink,
      },
    ],
  },

  {
    id: 'course-details',
    title: 'Course details',
    section: 'courseDetails',
    gate: {
      when: (ctx) => Boolean(ctx.activeCourse),
      section: (ctx) => SELECTION_GATE_SECTION[courseSelectionProblem(ctx)] || 'display1',
      title: (ctx) => SELECTION_GATE_TITLE[courseSelectionProblem(ctx)] || 'Timeline',
      wantsClick: true,
      text: (ctx) => SELECTION_GATE_TEXT[courseSelectionProblem(ctx)] || SELECTION_GATE_TEXT['no-selection'],
      target: (ctx) => selectionGateTarget(courseSelectionProblem(ctx)),
    },
    steps: [
      {
        id: 'course-description',
        title: 'Course Description',
        text: 'This shows information about the entire course.',
        target: courseDescription,
      },
      {
        id: 'catalog-entry',
        title: 'Catalog Entry',
        wantsClick: true,
        text: 'This goes to the most recent official catalog entry.',
        target: catalogEntryLink,
        clickAdvances: followsTheLink,
      },
    ],
  },

  {
    id: 'header',
    title: 'Header',
    section: 'header',
    steps: [
      {
        id: 'share',
        title: 'Share',
        wantsClick: true,
        text: 'Copies a link with the selected courses and settings preserved.',
        target: headerShareButton,
        clickAdvances: followsTheLink,
      },
      {
        id: 'info',
        title: 'Info/Data',
        wantsClick: true,
        text: 'Detailed information here.',
        target: headerInfoLink,
        clickAdvances: followsTheLink,
      },
      {
        id: 'support',
        title: 'Support Me',
        wantsClick: true,
        text: 'If you enjoy this tool, support its development!',
        target: headerSupportLink,
        clickAdvances: followsTheLink,
      },
      {
        id: 'tutorial-link',
        title: 'Tutorial Link',
        wantsClick: true,
        text: 'View the tutorial again.',
        target: headerTutorialLink,
        clickAdvances: followsTheLink,
      },
    ],
  },
];
