import React from 'react';
import {
  courseCountToggle,
  hasYearColumn,
  nthCourseItem,
  preferredFilledSemesterBar,
  preferredFilledSemesterCount,
  topLeftSemesterBar,
  yearColumnCell,
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
//   text        the instruction, plain text or JSX
//   target      () => Element | null - what the arrow points at
//   staticTarget the arrow position is measured once and then only on resize
//   available   (ctx) => boolean - false means the step is never shown and
//               never counted in the step total
//   onEnter     (ctx) => void - a real change to the app, applied on entry in
//               either direction. Anything it does persists after the tutorial
//   decorations names of tutorial-only page decorations to apply on this step
//   acceptClick (ctx) => boolean - whether a click inside the focused section
//               advances. Defaults to true
//   advanceWhen (ctx) => boolean - advance as soon as this becomes true

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

const selectACourse = {
  text: 'Select a course. Click any course in the list to put it on the timeline.',
  target: () => nthCourseItem(5),
};

export const PARTS = [
  {
    id: 'course-selector',
    title: 'Course selector',
    section: 'courseSelector',
    steps: [
      {
        id: 'select-a-course',
        text: selectACourse.text,
        target: selectACourse.target,
        staticTarget: true,
        acceptClick: () => false,
        onEnter: (ctx) => {
          ctx.memo.alreadyAdded = new Set(ctx.coursesInDisplay1.map((c) => c.main_course_id));
        },
        advanceWhen: (ctx) =>
          ctx.coursesInDisplay1.some((c) => !(ctx.memo.alreadyAdded || new Set()).has(c.main_course_id)),
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
      target: selectACourse.target,
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
    ],
  },

  // Parts 3 to 5 - course display 2, course details and the header - are added
  // here as further entries once their steps are defined.
];
