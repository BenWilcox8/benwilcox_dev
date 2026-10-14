import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppContext } from '../contexts/AppContext';
import TutorialProvider from './TutorialProvider';

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

function appValue({ courses = [], years = [] }) {
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
  };
}

function Harness({ courses, years }) {
  return (
    <AppContext.Provider value={appValue({ courses, years })}>
      <TutorialProvider>
        <Timeline years={years} />
      </TutorialProvider>
    </AppContext.Provider>
  );
}

afterEach(() => {
  document.body.className = '';
});

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
