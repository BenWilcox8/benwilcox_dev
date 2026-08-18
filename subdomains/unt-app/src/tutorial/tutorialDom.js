// How the tutorial finds the things it points at.
//
// The tutorial reads the live page through the class names the feature
// components already render, instead of holding refs inside them. That keeps
// the tutorial additive: no feature component has to know it exists.

import { isUnobstructed, visibleFraction } from './tutorialVisibility';

// The step-3 rule of part 2: prefer a filled bar from an earlier year than
// this one, as close to it as possible.
export const PREFERRED_FILLED_BEFORE_YEAR = 2025;

export function one(selector, root = document) {
  return root ? root.querySelector(selector) : null;
}

export function all(selector, root = document) {
  return root ? Array.from(root.querySelectorAll(selector)) : [];
}

// --- Course selector -------------------------------------------------------

// The nth course in the list, counted from one. The list is virtualised, so
// only the rows near the top of the viewport exist in the DOM - which is
// exactly where the first few courses are.
export function nthCourseItem(position) {
  const items = all('.all-courses-list .course-item');
  const item = items[position - 1] || items[items.length - 1] || null;
  // The row fills the whole panel, so the arrow points at the course text
  // instead: a narrow target leaves no doubt which row is meant.
  return item ? one('.course-item-text', item) || item : null;
}

// --- Course display 1 ------------------------------------------------------

export function firstCourseRow() {
  return one('.course-display1-list .course-row');
}

// The year of each column, read from the timeline header. The header and every
// course row render the same year list in the same order, so the header is the
// only place the tutorial has to read a year from.
export function displayedYears() {
  return all('.semester-view-header-timeline .year-column-header')
    .map((header) => parseInt(header.textContent, 10));
}

// Year columns of the first course row, paired with their year.
export function firstRowYearColumns() {
  const row = firstCourseRow();
  if (!row) return [];
  const years = displayedYears();
  return all('.year-column', row).map((element, index) => ({ element, year: years[index] }));
}

// Top-left-most semester bar of the timeline, whatever its fill.
export function topLeftSemesterBar() {
  const row = firstCourseRow();
  if (!row) return null;
  return one('.semester-bar, .specific-semester-bar', row);
}

// The filled bar the tutorial talks about in steps 3 and 4 of part 2: the
// closest filled year before PREFERRED_FILLED_BEFORE_YEAR, or else the most
// recent filled year there is.
export function preferredFilledSemesterBar() {
  const columns = firstRowYearColumns()
    .map((column) => ({
      ...column,
      bar: one('.semester-bar.filled, .specific-semester-bar.filled', column.element),
    }))
    .filter((column) => column.bar && Number.isFinite(column.year));

  if (columns.length === 0) return null;

  const earlier = columns.filter((column) => column.year < PREFERRED_FILLED_BEFORE_YEAR);
  const pool = earlier.length > 0 ? earlier : columns;
  return pool.reduce((best, column) => (column.year > best.year ? column : best)).bar;
}

// The offering count drawn inside that filled bar. It exists only while the
// "Course Count" toggle is on.
export function preferredFilledSemesterCount() {
  const bar = preferredFilledSemesterBar();
  return bar ? one('span', bar) : null;
}

// The "Course Count" toggle in the timeline header.
export function courseCountToggle() {
  const input = document.getElementById('course-count');
  if (!input) return null;
  return input.closest('.checkbox-row') || input.parentElement || input;
}

// A semester cell in a year column of the given kind: 'listed', 'unlisted' or
// 'pre-2011'. A column that is already on screen is preferred, so explaining
// the colours does not drag the timeline back and forth.
export function yearColumnCell(kind) {
  const columns = firstRowYearColumns().filter((entry) => entry.element.classList.contains(kind));
  if (columns.length === 0) return null;
  const onScreen = columns.find(
    (entry) => visibleFraction(entry.element) > 0.9 && isUnobstructed(entry.element)
  );
  const column = onScreen || columns[0];
  return one('.semester-cell', column.element) || column.element;
}

export function hasYearColumn(kind) {
  return yearColumnCell(kind) !== null;
}
