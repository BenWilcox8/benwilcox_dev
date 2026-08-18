import {
  courseCountToggle,
  displayedYears,
  hasYearColumn,
  nthCourseItem,
  preferredFilledSemesterBar,
  topLeftSemesterBar,
} from './tutorialDom';

// A cut-down copy of what Course Display 1 renders: a timeline header naming
// the years, and one course row with a year column per year.
function renderTimeline(years, { filledYears = [], kinds = {} } = {}) {
  document.body.innerHTML = `
    <div class="semester-view-header">
      <div class="semester-view-header-toggles">
        <input type="checkbox" id="course-count" />
      </div>
      <div class="semester-view-header-timeline">
        ${years.map((year) => `<div class="year-column-header">${year}</div>`).join('')}
      </div>
    </div>
    <div class="course-display1-list">
      <div class="course-row">
        ${years
          .map(
            (year) => `
          <div class="year-column ${kinds[year] || 'listed'}" data-year="${year}">
            <div class="semester-cell">
              <div class="semester-bar fall ${filledYears.includes(year) ? 'filled' : ''}"
                   data-year="${year}"><span>1</span></div>
              <div class="semester-bar spring"></div>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('displayedYears', () => {
  it('reads the years from the timeline header', () => {
    renderTimeline([2026, 2025, 2024]);
    expect(displayedYears()).toEqual([2026, 2025, 2024]);
  });
});

describe('topLeftSemesterBar', () => {
  it('is the first bar of the first year of the first row', () => {
    renderTimeline([2026, 2025]);
    expect(topLeftSemesterBar().dataset.year).toBe('2026');
  });

  it('is nothing at all while the timeline is empty', () => {
    document.body.innerHTML = '';
    expect(topLeftSemesterBar()).toBeNull();
  });
});

describe('preferredFilledSemesterBar', () => {
  it('takes the filled year closest below 2025', () => {
    renderTimeline([2026, 2025, 2024, 2023, 2022], { filledYears: [2025, 2023, 2022] });
    expect(preferredFilledSemesterBar().dataset.year).toBe('2023');
  });

  it('takes the most recent filled year when every one of them is later', () => {
    renderTimeline([2026, 2025], { filledYears: [2026, 2025] });
    expect(preferredFilledSemesterBar().dataset.year).toBe('2026');
  });

  it('is nothing at all when no bar is filled', () => {
    renderTimeline([2026, 2025]);
    expect(preferredFilledSemesterBar()).toBeNull();
  });
});

describe('hasYearColumn', () => {
  it('tells the tutorial which colour steps apply', () => {
    renderTimeline([2026, 2012, 2010], {
      kinds: { 2026: 'listed', 2012: 'unlisted', 2010: 'pre-2011' },
    });
    expect(hasYearColumn('listed')).toBe(true);
    expect(hasYearColumn('unlisted')).toBe(true);
    expect(hasYearColumn('pre-2011')).toBe(true);
  });

  it('is false for a colour no course in the timeline has', () => {
    renderTimeline([2026, 2025], { kinds: { 2026: 'listed', 2025: 'listed' } });
    expect(hasYearColumn('pre-2011')).toBe(false);
  });
});

describe('courseCountToggle', () => {
  it('finds the row that holds the Course Count checkbox', () => {
    renderTimeline([2026]);
    expect(courseCountToggle()).toBe(document.querySelector('.semester-view-header-toggles'));
  });
});

describe('nthCourseItem', () => {
  it('points at the course text of the nth course', () => {
    document.body.innerHTML = `<div class="all-courses-list">
      ${[1, 2, 3, 4, 5, 6]
        .map((n) => `<li class="course-item"><span class="course-item-text">C${n}</span></li>`)
        .join('')}
    </div>`;
    expect(nthCourseItem(5).textContent).toBe('C5');
  });

  it('falls back to the last course when the list is shorter', () => {
    document.body.innerHTML = `<div class="all-courses-list">
      <li class="course-item"><span class="course-item-text">only</span></li>
    </div>`;
    expect(nthCourseItem(5).textContent).toBe('only');
  });
});
