import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AppContext } from '../contexts/AppContext';
import SemesterBar from '../components/CourseDisplay1/SemesterView/SemesterBar';
import ResizeHandle from '../components/shared/ResizeHandle';
import TutorialProvider from './TutorialProvider';
import { forgetTutorial, markTutorialSeen } from './tutorialStorage';

// A cut-down copy of what Course Display 1 renders, drawn from the same state
// the tutorial reads, so the columns appear on the commit that adds them.
function Timeline({ years }) {
  const kinds = ['listed', 'unlisted', 'pre-2011'];
  return (
    <div className="course-display1-list">
      <div className="course-row">
        {years.map((year, index) => (
          <div className={`year-column ${kinds[index % kinds.length]}`} key={year}>
            <div className="semester-cell">
              <div className="semester-bar fall filled" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function appValue({ courses = [], years = [], setAsActiveCourse = () => {} }) {
  return {
    coursesInDisplay1: courses,
    displayYears: years,
    activeCourse: courses[0] || null,
    filteredCourses: [],
    granularView: false,
    showCourseCount: false,
    showAllYears: true,
    appLoading: false,
    dbError: null,
    setGranularView: () => {},
    setShowCourseCount: () => {},
    setShowAllYears: () => {},
    setAsActiveCourse,
  };
}

function Harness({ courses, years, setAsActiveCourse, children }) {
  return (
    <AppContext.Provider value={appValue({ courses, years, setAsActiveCourse })}>
      <TutorialProvider>
        <Timeline years={years} />
        {children}
      </TutorialProvider>
    </AppContext.Provider>
  );
}

// jsdom does no layout, so it has no scrollIntoView, which a step calls to
// bring its subject into view.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterAll(() => {
  delete Element.prototype.scrollIntoView;
});

beforeEach(() => {
  forgetTutorial();
});

afterEach(() => {
  document.body.className = '';
});

const course = { main_course_id: 1, course_code: 'CSCE 1030', course_name: 'Computer Science I' };
const years = [2011, 2012, 2013];

// Mounted the way a first visit goes: the course arrives after the tutorial has
// started, which takes it to the first step of Course display 1.
function renderOnTheTimeline(child, setAsActiveCourse) {
  const ui = (courses, shown) => (
    <Harness courses={courses} years={shown} setAsActiveCourse={setAsActiveCourse}>
      {child}
    </Harness>
  );
  const view = render(ui([], []));
  view.rerender(ui([course], []));
  view.rerender(ui([course], years));
  return view;
}

const semesterBar = (
  <SemesterBar course={course} year={2011} broadSemester="Fall"
    offeringsForSemester={[]} specificSemesterTypes={['Fall']} />
);

function SizedHandle() {
  const [width, setWidth] = React.useState(150);
  return (
    <ResizeHandle className="handle" label="Resize the year and semester filters"
      width={width} setWidth={setWidth} position={(w) => w} getMaxWidth={() => 400} />
  );
}

const press = (element, key) => {
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
};

test('the step count of a part covers the columns drawn as the part is entered', () => {
  const { rerender } = render(<Harness courses={[]} years={[]} />);

  // Part 1 has one step and it is done by putting a course on the timeline.
  expect(screen.getByText('1/1')).toBeInTheDocument();

  // The course arrives and the tutorial moves to Course display 1 on the same
  // commit, before the year columns of that course have been drawn.
  rerender(<Harness courses={[{ main_course_id: 1 }]} years={[]} />);

  // The columns are drawn. The count has to include their steps from the first
  // frame they exist, not from the next beat of the availability poll.
  rerender(<Harness courses={[{ main_course_id: 1 }]} years={[2011, 2012, 2013]} />);

  expect(screen.getByText('1/10')).toBeInTheDocument();
});

// A mouse click on an element that acts as a button leaves the focus on it. The
// tutorial still owns Space, the same as when the focus is on a real button.
test('Space goes to the next step after a mouse click focused a semester bar', () => {
  const setAsActiveCourse = jest.fn();
  renderOnTheTimeline(semesterBar, setAsActiveCourse);
  expect(screen.getByText('1/10')).toBeInTheDocument();

  const semester = screen.getByRole('button', { name: 'CSCE 1030 Fall 2011, 0 offerings' });
  act(() => { semester.focus(); });
  fireEvent.click(semester);
  expect(setAsActiveCourse).toHaveBeenCalledTimes(1);

  press(semester, ' ');

  expect(screen.getByText('2/10')).toBeInTheDocument();
  expect(setAsActiveCourse).toHaveBeenCalledTimes(1);
});

test('Enter and Space click a focused semester bar when the tutorial is not running', () => {
  markTutorialSeen();
  const setAsActiveCourse = jest.fn();
  renderOnTheTimeline(semesterBar, setAsActiveCourse);
  expect(screen.queryByText(/^\d+\/\d+$/)).toBeNull();

  const semester = screen.getByRole('button', { name: 'CSCE 1030 Fall 2011, 0 offerings' });
  act(() => { semester.focus(); });
  press(semester, 'Enter');
  expect(setAsActiveCourse).toHaveBeenCalledTimes(1);
  press(semester, ' ');
  expect(setAsActiveCourse).toHaveBeenCalledTimes(2);
  expect(setAsActiveCourse).toHaveBeenLastCalledWith(course, 2011, ['Fall']);
});

test('the arrow keys on a focused resize handle move the tutorial, not the handle', () => {
  renderOnTheTimeline(<SizedHandle />);
  expect(screen.getByText('1/10')).toBeInTheDocument();

  const handle = screen.getByRole('separator', { name: 'Resize the year and semester filters' });
  act(() => { handle.focus(); });
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(screen.getByText('2/10')).toBeInTheDocument();
  fireEvent.keyDown(handle, { key: 'ArrowLeft' });
  expect(screen.getByText('1/10')).toBeInTheDocument();
  expect(handle).toHaveAttribute('aria-valuenow', '150');

  // The tutorial has no use for End, so the handle keeps it.
  fireEvent.keyDown(handle, { key: 'End' });
  expect(handle).toHaveAttribute('aria-valuenow', '400');
});
