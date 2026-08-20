/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   These read the shape of the page rather than its words: where the bar sits
   relative to the way back, and every anchor on the page whatever it says. A
   role query says neither. */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import InfoPage from './InfoPage';

// The information page is about the database rather than made of it, so it is
// readable at any point in the download and carries the wait with it.
function renderWith(state) {
  return render(
    <MemoryRouter>
      <AppContext.Provider value={state}>
        <InfoPage />
      </AppContext.Provider>
    </MemoryRouter>
  );
}

const midDownload = {
  dbRequested: true,
  appLoading: true,
  dbError: null,
  loadingProgress: 40,
  loadingMessage: 'Downloading database...',
};

const loaded = {
  appLoading: false,
  dbError: null,
  loadingProgress: 100,
  loadingMessage: 'Ready',
};

describe('GitHub links on the info/data page', () => {
  it('renders no links to the old private monorepo', () => {
    const { container } = renderWith(loaded);
    const old = Array.from(container.querySelectorAll('a[href]')).filter((a) =>
      a.href.includes('SpecialAgentB3')
    );
    expect(old).toHaveLength(0);
  });

  it('renders exactly 11 links to the new public data repo', () => {
    const { container } = renderWith(loaded);
    const updated = Array.from(container.querySelectorAll('a[href]')).filter((a) =>
      a.href.includes('BenWilcox8/University-Historical-Courses')
    );
    expect(updated).toHaveLength(11);
  });

  it('all new repo links use the correct base URL', () => {
    const { container } = renderWith(loaded);
    const base = 'https://github.com/BenWilcox8/University-Historical-Courses';
    const updated = Array.from(container.querySelectorAll('a[href]')).filter((a) =>
      a.href.includes('BenWilcox8/University-Historical-Courses')
    );
    updated.forEach((a) => {
      expect(a.href).toMatch(new RegExp(`^${base.replace(/\./g, '\\.')}/(tree|blob)/main/`));
    });
  });
});

describe('the information page while the database is still coming down', () => {
  it('reads in full before the database has arrived', () => {
    renderWith(midDownload);
    expect(screen.getByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Main Page' })).toBeInTheDocument();
  });

  it('carries a live copy of the bar, under the way back', () => {
    const { container } = renderWith(midDownload);
    const bar = container.querySelector('.info-loading-bar .progress-bar');
    expect(bar).toHaveStyle({ transform: 'scaleX(0.4)' });
    expect(screen.getByText('Downloading database...')).toBeInTheDocument();

    const header = container.querySelector('.info-header');
    const link = screen.getByRole('link', { name: 'Back to Main Page' });
    expect(header.contains(link)).toBe(true);
    expect(
      link.compareDocumentPosition(container.querySelector('.info-loading-bar'))
        & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('follows the number the main page is showing, not one of its own', () => {
    const { container } = renderWith({ ...midDownload, loadingProgress: 99 });
    expect(container.querySelector('.info-loading-bar .progress-bar'))
      .toHaveStyle({ transform: 'scaleX(0.99)' });
  });

  it('drops the bar once the wait is over', () => {
    const { container } = renderWith({
      dbRequested: true,
      appLoading: false, dbError: null, loadingProgress: 100, loadingMessage: 'Ready',
    });
    expect(container.querySelector('.info-loading-bar')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
  });

  // The page is reachable while the database is still coming down, so a way
  // back that is a plain anchor is a fresh load of the whole site - which
  // throws away the download that is already most of the way there.
  it('goes back by changing route, never by loading the site again', () => {
    const { container } = renderWith(midDownload);
    const inApp = Array.from(container.querySelectorAll('a[href]')).filter((a) => {
      const href = a.getAttribute('href');
      return href.startsWith('/') && !href.startsWith('//');
    });
    expect(inApp.length).toBeGreaterThan(1);

    inApp.forEach((link) => {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      // The router changes route on this, so the dispatch is a React update.
      // defaultPrevented is set by the listener during dispatch, before any of
      // that settles, so wrapping it costs the assertion nothing.
      act(() => { link.dispatchEvent(click); });
      expect([link.textContent, click.defaultPrevented]).toEqual([link.textContent, true]);
    });
  });

  it('drops the bar when the download has failed, rather than leaving it stuck', () => {
    const { container } = renderWith({
      dbRequested: true,
      appLoading: true, dbError: new Error('no'), loadingProgress: 40, loadingMessage: 'x',
    });
    expect(container.querySelector('.info-loading-bar')).toBeNull();
  });
});

// The tutorial opens this page in a second tab on purpose. Nothing on this
// page is made of the database, so a tab that opens straight onto it never
// asks for one - and there is then no download to be part way through.
describe('the information page in a tab that never asked for the database', () => {
  const neverAsked = {
    dbRequested: false,
    appLoading: true,
    dbError: null,
    loadingProgress: 0,
    loadingMessage: '',
  };

  it('reads in full', () => {
    renderWith(neverAsked);
    expect(screen.getByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Main Page' })).toBeInTheDocument();
  });

  it('draws no bar, rather than one stuck at nothing', () => {
    const { container } = renderWith(neverAsked);
    expect(container.querySelector('.info-loading-bar')).toBeNull();
  });
});
