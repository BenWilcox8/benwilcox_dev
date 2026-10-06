import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Papa from 'papaparse';
import { AppProvider } from '../contexts/AppContext';
import useDatabase from '../hooks/useDatabase';
import CourseDisplay1 from './CourseDisplay1/CourseDisplay1';
import CourseDisplay2 from './CourseDisplay2/CourseDisplay2';

// The "Include Former Professors" toggle, end to end: a real SQLite database
// with the schema of creating_data/7_generate_db.py, read by sql.js through the
// app's own queries, and the two displays the reader looks at.

jest.mock('../hooks/useDatabase');
jest.mock('papaparse', () => ({ parse: jest.fn() }));
// Dragging rows is not what is tested here, and react-dnd ships only as ES
// modules, which the jest of react-scripts does not transform.
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, (node) => node],
  useDrop: () => [{ handlerId: null }, (node) => node],
}));

const initSqlJs = require('sql.js/dist/sql-asm.js');

const SCHEMA = `
CREATE TABLE Faculty (
    main_faculty_id INTEGER PRIMARY KEY, faculty_name TEXT, faculty_title TEXT,
    faculty_department TEXT, faculty_college TEXT, faculty_link TEXT,
    faculty_former BOOLEAN, faculty_last_seen TEXT);
CREATE TABLE MainCourses (main_course_id INTEGER PRIMARY KEY, course_code TEXT, course_name TEXT);
CREATE TABLE AllCatalog (
    main_catalog_id INTEGER PRIMARY KEY, main_course_id INTEGER, course_code TEXT, course_name TEXT,
    catalog_code TEXT, catalog_year INTEGER, catalog_type TEXT, course_link TEXT, course_scraped BOOLEAN,
    course_hours TEXT, course_description TEXT, course_specific_hours TEXT, course_prerequisites TEXT,
    course_fees TEXT, course_other TEXT);
CREATE TABLE AllOfferings (
    main_offer_id INTEGER PRIMARY KEY, main_catalog_id INTEGER, main_faculty_id INTEGER, year INTEGER,
    broad_semester TEXT, specific_semester TEXT, full_course_name TEXT, course_name TEXT,
    link_to_highlight TEXT);
`;

const PROFILE = 'https://facultyinfo.unt.edu/faculty-profile?profile=';

let SQL;
let db;

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = new SQL.Database();
  db.run(SCHEMA);
  db.run(`INSERT INTO Faculty VALUES
    (0, 'Ada Current', 'Lecturer', 'CSE', 'Engineering', '${PROFILE}ac0001', 0, '2026-08-19'),
    (1, 'Bo Former', 'Lecturer', 'CSE', 'Engineering', '${PROFILE}bf0002', 1, '2026-03-16'),
    (2, 'Cy Former', 'Professor', 'CSE', 'Engineering', '${PROFILE}cf0003', 1, '2025-06-19')`);
  db.run(`INSERT INTO MainCourses VALUES (1, 'CSCE 1010', 'Intro to Computing')`);
  db.run(`INSERT INTO AllCatalog (main_catalog_id, main_course_id, course_code, course_name, catalog_year, catalog_type, course_link, course_scraped)
    VALUES (10, 1, 'CSCE 1010', 'Intro to Computing', 2018, 'Undergraduate', 'https://catalog.unt.edu/x', 0)`);
  db.run(`INSERT INTO AllOfferings VALUES
    (100, 10, 0, 2024, 'Fall', 'Fall', 'CSCE 1010.001', 'Intro to Computing', '${PROFILE}ac0001#previous-teaching'),
    (101, 10, 1, 2024, 'Fall', 'Fall', 'CSCE 1010.002', 'Intro to Computing', '${PROFILE}bf0002#previous-teaching'),
    (102, 10, 2, 2020, 'Spring', 'Spring', 'CSCE 1010.001', 'Intro to Computing', '${PROFILE}cf0003#previous-teaching')`);

  useDatabase.mockReturnValue({ db, loading: false, error: null, progress: 100 });
  Papa.parse.mockImplementation((url, { complete }) => complete({
    data: [
      { 'Specific Semester': 'Fall', 'Broad Semester': 'Fall', 'Semester Order': 0 },
      { 'Specific Semester': 'Spring', 'Broad Semester': 'Spring', 'Semester Order': 1 },
    ],
  }));
  window.matchMedia = undefined;
});

afterEach(() => {
  db.close();
  window.history.pushState({}, '', '/');
});

const renderApp = (search) => {
  window.history.pushState({}, '', `/${search}`);
  render(
    <AppProvider>
      <CourseDisplay1 />
      <CourseDisplay2 />
    </AppProvider>
  );
};

// Each semester bar of Course Display 1 names its year and its count in its
// title, and draws the count inside itself when there is one.
const bar = (semester, year, count) => screen.getByTitle(`${semester} ${year} (${count} offerings)`);
const toggle = () => screen.getByLabelText('Include Former Professors');

describe('Include Former Professors', () => {
  it('is on by default: the counts include former professors and their names are struck through, unlinked', async () => {
    renderApp('?courses=1&active=1');

    // Ada has Faculty ID 0, which once showed as "Staff".
    expect(await screen.findByRole('link', { name: 'Ada Current' }, { timeout: 4000 }))
      .toHaveAttribute('href', `${PROFILE}ac0001`);
    expect(toggle()).toBeChecked();
    expect(bar('Fall', 2024, 2)).toHaveTextContent('2');
    expect(bar('Spring', 2020, 1)).toHaveTextContent('1');

    const bo = await screen.findByText('Bo Former');
    expect(bo).toHaveClass('faculty-former');
    expect(bo).toHaveAttribute('title', 'No longer listed at UNT (last seen March 2026)');
    expect(screen.queryByRole('link', { name: 'Bo Former' })).toBeNull();
    expect(screen.getByText('Cy Former'))
      .toHaveAttribute('title', 'No longer listed at UNT (last seen June 2025)');
    expect(screen.queryByRole('link', { name: 'Cy Former' })).toBeNull();

    // The section code of a former professor is plain text as well, and the
    // one of a current professor still links to the highlighted section.
    expect(screen.getByText('CSCE 1010.002')).not.toHaveAttribute('href');
    expect(screen.queryByRole('link', { name: 'CSCE 1010.002' })).toBeNull();
    expect(screen.getAllByText('CSCE 1010.001')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'CSCE 1010.001' }))
      .toHaveAttribute('href', `${PROFILE}ac0001#previous-teaching`);
    expect(screen.getByRole('link', { name: 'Ada Current' })).not.toHaveClass('faculty-former');
  });

  it('leaves former professors out of both displays when it is turned off, and puts them back when it is turned on', async () => {
    renderApp('?courses=1&active=1');
    await screen.findByText('Bo Former', {}, { timeout: 4000 });
    expect(screen.getByLabelText('2020')).toBeChecked();

    fireEvent.click(toggle());

    expect(toggle()).not.toBeChecked();
    expect(await screen.findByTitle('Fall 2024 (1 offerings)')).toHaveTextContent('1');
    expect(bar('Spring', 2020, 0)).toHaveTextContent('');
    await waitFor(() => expect(screen.queryByText('Bo Former')).toBeNull());
    expect(screen.queryByText('Cy Former')).toBeNull();
    expect(screen.getByRole('link', { name: 'Ada Current' })).toBeInTheDocument();
    // The year a former professor alone taught is no longer offered to pick.
    expect(screen.queryByLabelText('2020')).toBeNull();

    fireEvent.click(toggle());

    expect(await screen.findByTitle('Fall 2024 (2 offerings)')).toHaveTextContent('2');
    expect(bar('Spring', 2020, 1)).toHaveTextContent('1');
    // The selection was full before, so it is full again with the year the
    // toggle brought back.
    expect(await screen.findByText('Cy Former')).toHaveClass('faculty-former');
    expect(screen.getByLabelText('2020')).toBeChecked();
    expect(screen.getByText('Bo Former')).toHaveClass('faculty-former');
  });

  it('keeps a course taught only by former professors, with no sections, when it is off', async () => {
    db.run(`DELETE FROM AllOfferings WHERE main_faculty_id = 0`);
    // settings=45 is the default (13) with the "former professors off" bit (32).
    renderApp('?courses=1&active=1&settings=45');

    expect(await screen.findByText('No offerings match the current filters.', {}, { timeout: 4000 }))
      .toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    expect(screen.getByRole('heading', { name: 'CSCE 1010' })).toBeInTheDocument();
    expect(bar('Fall', 2024, 0)).toHaveTextContent('');
    expect(bar('Spring', 2020, 0)).toHaveTextContent('');
    expect(screen.queryByText('Bo Former')).toBeNull();
  });

  it('always includes former professors on the mobile layout, which has no toggle', async () => {
    window.matchMedia = (query) => ({
      matches: query === '(max-width: 900px)',
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    renderApp('?courses=1&active=1&settings=45');

    expect(await screen.findByText('Bo Former', {}, { timeout: 4000 })).toHaveClass('faculty-former');
    expect(await screen.findByTitle('Fall 2024 (2 offerings)')).toHaveTextContent('2');
  });
});
