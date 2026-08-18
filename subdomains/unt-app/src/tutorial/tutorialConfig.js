import React from 'react';
import {
  catalogEntryLink,
  courseCellLink,
  courseCountToggle,
  courseDescription,
  hasCourseCell,
  hasYearColumn,
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
//   text        the instruction: plain text, JSX, or a function of the app
//               state that returns either
//   target      (ctx) => Element | null - what the arrow points at
//   staticTarget the arrow position is measured once and then only on resize
//   arrowSide   'left' | 'right' | 'top' | 'bottom' - the side the arrow comes
//               from, used whenever there is room for it
//   available   (ctx) => boolean - false means the step is never shown and
//               never counted in the step total
//   onEnter     (ctx) => void - a real change to the app, applied on entry in
//               either direction. Anything it does persists after the tutorial
//   decorations names of tutorial-only page decorations to apply on this step
//   acceptClick (ctx) => boolean - whether a click inside the focused section
//               advances. Defaults to true
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
  header: { selector: '.header-container', wholePanel: false },
};

// Decoration names a step may ask for. The overlay puts the matching class on
// <body> while the step is showing and takes it off again when the step ends.
export const DECORATION_CLASSES = {
  semesterNames: 'tutorial-semester-names',
};

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
        text: SELECT_A_COURSE.text,
        target: SELECT_A_COURSE.target,
        staticTarget: true,
        acceptClick: () => false,
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
      text: 'The timeline is empty. Select a course in the course selector to go on.',
      target: SELECT_A_COURSE.target,
    },
    steps: [
      {
        id: 'semester-bars',
        text: 'Each bar on the timeline shows a semester that this course was offered.',
        target: topLeftSemesterBar,
        onEnter: (ctx) => {
          ctx.setGranularView(false);
          ctx.setShowCourseCount(false);
        },
      },
      {
        id: 'broad-semesters',
        text: 'Each year has Fall, Summer, Spring, Winter.',
        target: topLeftSemesterBar,
        decorations: ['semesterNames'],
      },
      {
        id: 'filled-bars',
        text: 'A filled-in bar means that a professor actually taught this class during this year and semester.',
        target: preferredFilledSemesterBar,
      },
      {
        id: 'course-count',
        text: (
          <>
            <strong>"Course Count"</strong> displays the number of class sections in a given semester.
          </>
        ),
        // Before the toggle is on there is no number to point at, so the arrow
        // points at the toggle itself.
        target: (ctx) => (ctx.showCourseCount ? preferredFilledSemesterCount() : courseCountToggle()),
        // A click while the toggle is still off is the user turning it on, and
        // must not also advance the step.
        acceptClick: (ctx) => ctx.showCourseCount,
      },
      {
        id: 'listed-years',
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
        text: 'A dark-gray background means that this course was not listed during this year.',
        target: () => yearColumnCell('unlisted'),
        available: () => hasYearColumn('unlisted'),
      },
      {
        id: 'pre-2011-years',
        text: 'Years before 2011 are colored light-gray because the catalog was only introduced in 2011.',
        target: () => yearColumnCell('pre-2011'),
        available: () => hasYearColumn('pre-2011'),
      },
      {
        id: 'open-a-semester',
        text: "Click a semester for that year's sections and professors.",
        // Any bar is a semester the reader can open, so a course that was never
        // taught still gets an arrow.
        target: () => preferredFilledSemesterBar() || topLeftSemesterBar(),
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
        text: 'Select specific years/semesters to look at.',
        target: yearsSpecifierHeader,
        // Ticking years and semesters takes several clicks, so only the
        // keyboard moves this step on.
        acceptClick: () => false,
      },
      {
        id: 'course-cells',
        text: 'Each box is a real course section. Links go to the real source.',
        target: courseCellLink,
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
      text: (ctx) => SELECTION_GATE_TEXT[courseSelectionProblem(ctx)] || SELECTION_GATE_TEXT['no-selection'],
      target: (ctx) => selectionGateTarget(courseSelectionProblem(ctx)),
    },
    steps: [
      {
        id: 'course-description',
        text: 'This shows information about the entire course.',
        target: courseDescription,
      },
      {
        id: 'catalog-entry',
        text: 'This goes to the most recent official catalog entry.',
        target: catalogEntryLink,
      },
    ],
  },

  {
    id: 'header',
    title: 'Header',
    section: 'header',
    steps: [
      // The header links sit shoulder to shoulder, so every arrow here comes
      // from below, where it has the page to itself.
      {
        id: 'share',
        text: 'Copies a link with the selected courses and settings preserved.',
        target: headerShareButton,
        arrowSide: 'bottom',
      },
      {
        id: 'info',
        text: 'Detailed information here.',
        target: headerInfoLink,
        arrowSide: 'bottom',
      },
      {
        id: 'support',
        text: 'If you enjoy this tool, support its development!',
        target: headerSupportLink,
        arrowSide: 'bottom',
      },
      {
        id: 'tutorial-link',
        text: 'View the tutorial again.',
        target: headerTutorialLink,
        arrowSide: 'bottom',
      },
    ],
  },
];
