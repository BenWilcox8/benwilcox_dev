import {
  catalogEntryLink,
  courseCellLink,
  courseCountToggle,
  courseDescription,
  hasCourseCell,
  isCourseCountToggleClick,
  isFilledSemesterBarClick,
  isInertClick,
  isLinkClick,
  headerInfoLink,
  headerShareButton,
  headerSupportLink,
  headerTutorialLink,
  displayedYears,
  hasYearColumn,
  nthCourseItem,
  preferredFilledSemesterBar,
  topLeftSemesterBar,
  yearColumnCell,
  yearsSpecifierHeader,
} from './tutorialDom';

// A cut-down copy of what Course Display 1 renders: a timeline header naming
// the years, and one course row per course with a year column per year.
function renderRow(years, filledYears, kinds) {
  return `<div class="course-row">
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
      </div>`;
}

function buildTimeline(years, { filledYears = [], kinds = {}, secondRow = null } = {}) {
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
      ${renderRow(years, filledYears, kinds)}
      ${secondRow ? renderRow(years, secondRow.filledYears || [], secondRow.kinds || {}) : ''}
    </div>`;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('displayedYears', () => {
  it('reads the years from the timeline header', () => {
    buildTimeline([2026, 2025, 2024]);
    expect(displayedYears()).toEqual([2026, 2025, 2024]);
  });
});

describe('topLeftSemesterBar', () => {
  it('is the first bar of the first year of the first row', () => {
    buildTimeline([2026, 2025]);
    expect(topLeftSemesterBar().dataset.year).toBe('2026');
  });

  it('is nothing at all while the timeline is empty', () => {
    document.body.innerHTML = '';
    expect(topLeftSemesterBar()).toBeNull();
  });
});

describe('preferredFilledSemesterBar', () => {
  it('takes the filled year closest below 2025', () => {
    buildTimeline([2026, 2025, 2024, 2023, 2022], { filledYears: [2025, 2023, 2022] });
    expect(preferredFilledSemesterBar().dataset.year).toBe('2023');
  });

  it('takes the most recent filled year when every one of them is later', () => {
    buildTimeline([2026, 2025], { filledYears: [2026, 2025] });
    expect(preferredFilledSemesterBar().dataset.year).toBe('2026');
  });

  it('is nothing at all when no bar is filled', () => {
    buildTimeline([2026, 2025]);
    expect(preferredFilledSemesterBar()).toBeNull();
  });
});

describe('hasYearColumn', () => {
  it('tells the tutorial which colour steps apply', () => {
    buildTimeline([2026, 2012, 2010], {
      kinds: { 2026: 'listed', 2012: 'unlisted', 2010: 'pre-2011' },
    });
    expect(hasYearColumn('listed')).toBe(true);
    expect(hasYearColumn('unlisted')).toBe(true);
    expect(hasYearColumn('pre-2011')).toBe(true);
  });

  it('is false for a colour no course in the timeline has', () => {
    buildTimeline([2026, 2025], { kinds: { 2026: 'listed', 2025: 'listed' } });
    expect(hasYearColumn('pre-2011')).toBe(false);
  });

  // Whether a year is listed is a fact about one course, so a second course can
  // be the only one that has a colour. The step still applies.
  it('sees a colour that only the second course on the timeline has', () => {
    buildTimeline([2026, 2025], {
      kinds: { 2026: 'listed', 2025: 'listed' },
      secondRow: { kinds: { 2026: 'listed', 2025: 'unlisted' } },
    });
    expect(hasYearColumn('unlisted')).toBe(true);
    const cell = yearColumnCell('unlisted');
    expect(cell.closest('.year-column').dataset.year).toBe('2025');
    expect(cell.closest('.course-row')).toBe(document.querySelectorAll('.course-row')[1]);
  });
});

describe('courseCountToggle', () => {
  it('finds the row that holds the Course Count checkbox', () => {
    buildTimeline([2026]);
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

describe('yearsSpecifierHeader', () => {
  it('picks the Years box, not the Semesters box beside it', () => {
    document.body.innerHTML = `<div class="specifiers-section">
      <div class="specifier-box"><h4>Years</h4></div>
      <div class="specifier-box"><h4>Semesters</h4></div>
    </div>`;
    expect(yearsSpecifierHeader().textContent).toBe('Years');
  });
});

describe('courseCellLink', () => {
  function renderCells(count) {
    document.body.innerHTML = `<div class="specific-courses-display">
      ${Array.from({ length: count }, (unused, index) =>
        `<div class="course-cell"><a class="course-name-link" href="#${index}">cell ${index + 1}</a></div>`
      ).join('')}
    </div>`;
  }

  it('points at the second section box', () => {
    renderCells(3);
    expect(courseCellLink().textContent).toBe('cell 2');
  });

  it('points at the first box when it is the only one', () => {
    renderCells(1);
    expect(courseCellLink().textContent).toBe('cell 1');
  });

  it('has nothing to point at when no section is showing', () => {
    renderCells(0);
    expect(hasCourseCell()).toBe(false);
    expect(courseCellLink()).toBeNull();
  });
});

describe('course details lookups', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="course-details-container">
      <div class="course-details-links">
        <a href="https://catalog.example/entry">Catalog Entry</a>
        <a href="https://search.example/code">Code Search</a>
      </div>
      <div class="course-details-description">What the course is about.</div>
    </div>`;
  });

  it('finds the catalog link by its name, not by its position', () => {
    expect(catalogEntryLink().getAttribute('href')).toBe('https://catalog.example/entry');
  });

  it('finds the description', () => {
    expect(courseDescription().textContent).toBe('What the course is about.');
  });
});

describe('header lookups', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="header-container">
      <div class="header-section right">
        <div class="top-right">
          <button class="tutorial-header-link">Tutorial</button>
          <a href="/info">Info/Data</a>
          <button class="share-button-header">Share</button>
        </div>
        <div class="bottom-right">
          <a href="https://buymeacoffee.com/benwilcox">Support Me</a>
          <a href="mailto:someone@example.com">Contact</a>
        </div>
      </div>
    </div>`;
  });

  it('finds each header target', () => {
    expect(headerShareButton().textContent).toBe('Share');
    expect(headerInfoLink().textContent).toBe('Info/Data');
    expect(headerSupportLink().textContent).toBe('Support Me');
    expect(headerTutorialLink().textContent).toBe('Tutorial');
  });
});

describe('what a click actually does', () => {
  beforeEach(() => {
    buildTimeline([2026, 2025], { filledYears: [2025] });
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="course-details-container">
         <div class="course-details-links"><a href="#c">Catalog Entry</a></div>
         <div class="course-details-description">Plain words nobody can click.</div>
       </div>
       <div class="all-courses-list">
         <li class="course-item"><span class="course-item-text">A course</span></li>
       </div>
       <div class="header-container">
         <button class="share-button-header">Share</button>
       </div>`
    );
  });

  function at(selector) {
    return document.querySelector(selector);
  }

  it('counts a bar, a course, a checkbox and a link as real actions', () => {
    expect(isInertClick(at('.semester-bar'))).toBe(false);
    expect(isInertClick(at('.course-item-text'))).toBe(false);
    expect(isInertClick(at('#course-count'))).toBe(false);
    expect(isInertClick(at('.course-details-links a'))).toBe(false);
    expect(isInertClick(at('.share-button-header'))).toBe(false);
  });

  it('counts plain text and empty space as doing nothing', () => {
    expect(isInertClick(at('.course-details-description'))).toBe(true);
    expect(isInertClick(at('.course-details-container'))).toBe(true);
  });

  it('recognises the Course Count toggle wherever inside it the click lands', () => {
    expect(isCourseCountToggleClick(at('#course-count'))).toBe(true);
    expect(isCourseCountToggleClick(at('.semester-bar'))).toBe(false);
  });

  it('tells a filled semester bar from an empty one', () => {
    expect(isFilledSemesterBarClick(at('.semester-bar.filled'))).toBe(true);
    expect(isFilledSemesterBarClick(at('.semester-bar:not(.filled)'))).toBe(false);
  });

  it('recognises a link, and the Share button that behaves like one', () => {
    expect(isLinkClick(at('.course-details-links a'))).toBe(true);
    expect(isLinkClick(at('.share-button-header'))).toBe(true);
    expect(isLinkClick(at('.semester-bar'))).toBe(false);
  });
});
