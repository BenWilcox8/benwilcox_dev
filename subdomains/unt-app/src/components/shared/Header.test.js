/* eslint-disable testing-library/no-node-access --
   The tutorial finds this link the way it finds everything else, through the
   class names the page renders, so the test looks the same way. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../../contexts/AppContext';
import { TutorialContext } from '../../tutorial/TutorialContext';
import { headerInfoLink } from '../../tutorial/tutorialDom';
import Header from './Header';

const appValue = {
  autoPin: true,
  showCourseGroups: false,
  showCourseCount: true,
  showAllYears: true,
  granularView: false,
  pinnedCourses: [],
  coursesInDisplay1: [],
  activeCourse: null,
};

function renderHeader(tutorial) {
  return render(
    <MemoryRouter>
      <AppContext.Provider value={appValue}>
        <TutorialContext.Provider value={tutorial}>
          <Header />
        </TutorialContext.Provider>
      </AppContext.Provider>
    </MemoryRouter>
  );
}

// The Info/Data step of the tutorial points at this link, so what the link does
// is what that step does.
describe('the header Info/Data link', () => {
  it('opens a second tab while the tutorial is running, leaving it where it is',
    () => {
      renderHeader({ active: true, restart: () => {} });
      const link = screen.getByRole('link', { name: 'Info/Data' });
      expect(link).toHaveAttribute('href', '/info');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      // That tab is a fresh load of the site on /info, where nothing is made of
      // the database - so it is the whole information page and no download.
      expect(headerInfoLink()).toBe(link);
    });

  // Off the tutorial there is no second tab to keep: changing route keeps the
  // download this tab may be part way through, and a plain anchor would not.
  it('changes route in this tab when the tutorial is not running', () => {
    renderHeader({ active: false, restart: () => {} });
    const link = screen.getByRole('link', { name: 'Info/Data' });
    expect(link).toHaveAttribute('href', '/info');
    expect(link).not.toHaveAttribute('target');
    expect(headerInfoLink()).toBe(link);
  });
});
