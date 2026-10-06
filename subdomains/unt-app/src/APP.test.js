import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './APP';
import { AppProvider } from './contexts/AppContext';
import useDatabase from './hooks/useDatabase';
import { fetchAllCourses, fetchAllCatalogForSearch } from './utils/dataUtils';

// jest.mock is hoisted above these imports, so the modules arrive mocked.
jest.mock('./hooks/useDatabase');
// Both ship an `exports` map and no `main`, which the jest that comes with
// react-scripts does not read, so they are stubbed rather than resolved. They
// are reporting beacons and draw nothing.
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }), { virtual: true });
jest.mock('@vercel/speed-insights/react', () => ({ SpeedInsights: () => null }), { virtual: true });
// Ship ESM that this jest cannot transform, and both belong to the desktop
// page, which never renders here: every case below is either the loading
// screen or the information page.
jest.mock('react-dnd', () => ({ DndProvider: ({ children }) => children }));
jest.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));
jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }) => children,
  Panel: ({ children }) => children,
  PanelResizeHandle: () => null,
}));
jest.mock('./utils/dataUtils');
jest.mock('papaparse', () => ({ parse: jest.fn() }));

// Whether the 87MB database was ever asked for on this load. The hook is the
// only thing that fetches it, and it fetches nothing until it is enabled.
const databaseAsked = () => useDatabase.mock.calls.some(([enabled]) => enabled === true);

function renderAt(path) {
  window.history.pushState({}, '', path);
  return render(<AppProvider><App /></AppProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  // Still coming down, so a page that has asked for it stays on the wait.
  useDatabase.mockReturnValue({ db: null, loading: true, error: null, progress: 20 });
  fetchAllCourses.mockResolvedValue([]);
  fetchAllCatalogForSearch.mockResolvedValue([]);
});

afterEach(() => {
  window.history.pushState({}, '', '/');
});

// The tutorial opens the header's Info/Data link in a second tab on purpose, so
// the page it is running on stays put. That tab is a fresh load of the site on
// /info, and the information page is written about the database rather than
// made of it, so it must arrive without pulling the database down.
describe('a tab opened straight onto the information page', () => {
  it('reads in full', async () => {
    renderAt('/info');
    expect(await screen.findByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
  });

  // What the page draws in that state is pinned in the information page's own
  // test; this is about the 87MB, and nothing else.
  it('never asks for the database', async () => {
    renderAt('/info');
    await screen.findByRole('heading', { name: 'Information/Data' });
    expect(databaseAsked()).toBe(false);
  });

  it('asks for it as soon as the reader goes to the main page', async () => {
    renderAt('/info');
    await userEvent.click(await screen.findByRole('link', { name: 'Back to Main Page' }));

    expect(await screen.findByRole('heading', { name: 'Loading Database...' })).toBeInTheDocument();
    await waitFor(() => expect(databaseAsked()).toBe(true));
  });
});

describe('a tab opened onto the main page', () => {
  it('asks for the database and waits on it', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Loading Database...' })).toBeInTheDocument();
    await waitFor(() => expect(databaseAsked()).toBe(true));
  });

  // The main page has nothing to show until the database is there, so it never
  // builds itself once, empty, on the way to the loading screen.
  it('never shows the app before the wait has begun', () => {
    renderAt('/');
    expect(screen.queryByText('UNT Historical Courses')).not.toBeInTheDocument();
  });
});
