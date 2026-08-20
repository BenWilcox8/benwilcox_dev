import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppContext, AppProvider } from './AppContext';
import useDatabase from '../hooks/useDatabase';
import { fetchAllCourses, fetchAllCatalogForSearch } from '../utils/dataUtils';
import { downloadProgress } from '../utils/loadingProgress';

// jest.mock is hoisted above these imports, so the modules arrive mocked.
jest.mock('../hooks/useDatabase');
jest.mock('../utils/dataUtils');
jest.mock('papaparse', () => ({ parse: jest.fn() }));

// What the loading screen and the information page both read: the wait, and
// whether there is an error to escape it with.
function Probe() {
  const { appLoading, dbError } = useContext(AppContext);
  return (
    <div>
      <span data-testid="waiting">{String(appLoading)}</span>
      <span data-testid="error">{dbError ? dbError.message : 'none'}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  useDatabase.mockReturnValue({ db: {}, loading: false, error: null, progress: 100 });
  fetchAllCourses.mockResolvedValue([]);
  fetchAllCatalogForSearch.mockResolvedValue([]);
});

afterEach(() => {
  console.error.mockRestore();
});

describe('the wait that follows the download', () => {
  it('ends when the courses and the search index are ready', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('waiting')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  // The download failing is not the only way the reader can be left with
  // nothing. Everything after it has to end the wait too, or the loading
  // screen stays up with no way off it.
  it('ends, and says why, when the courses cannot be read', async () => {
    fetchAllCourses.mockRejectedValue(new Error('database is truncated'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('waiting')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('database is truncated');
  });

  it('ends, and says why, when the search index cannot be built', async () => {
    fetchAllCatalogForSearch.mockRejectedValue(new Error('catalog query failed'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('waiting')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('catalog query failed');
  });
});

// The provider sits above the router, so it cannot see which page the reader
// opened. The page that is made of the database asks for it instead, and a tab
// that never asks downloads nothing at all.
describe('the database, downloaded only when a page asks for it', () => {
  function Asker() {
    const { dbRequested, requestDatabase, loadingProgress, setShowAllYears } =
      useContext(AppContext);
    return (
      <div>
        <span data-testid="asked">{String(dbRequested)}</span>
        <span data-testid="progress">{loadingProgress}</span>
        <button onClick={requestDatabase}>ask</button>
        <button onClick={() => setShowAllYears((on) => !on)}>nudge</button>
      </div>
    );
  }

  const renderAsker = () => render(<AppProvider><Asker /></AppProvider>);
  const ask = () => userEvent.click(screen.getByRole('button', { name: 'ask' }));

  it('is left alone until something asks for it', () => {
    useDatabase.mockReturnValue({ db: null, loading: false, error: null, progress: 0 });
    renderAsker();
    expect(useDatabase).toHaveBeenCalled();
    useDatabase.mock.calls.forEach(([enabled]) => expect(enabled).toBe(false));
    expect(screen.getByTestId('asked')).toHaveTextContent('false');
  });

  it('is downloaded once a page asks for it', async () => {
    useDatabase.mockReturnValue({ db: null, loading: false, error: null, progress: 0 });
    renderAsker();
    await ask();
    expect(useDatabase).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('asked')).toHaveTextContent('true');
  });

  // The reader may have been on the information page for a long time before
  // going to the main page, and that reading time is not download time.
  it('projects the bar from when it was asked for, not from the page load', async () => {
    const now = jest.spyOn(performance, 'now').mockReturnValue(300000);
    useDatabase.mockReturnValue({ db: null, loading: false, error: null, progress: 0 });
    renderAsker();
    await ask();

    now.mockReturnValue(302000);
    useDatabase.mockReturnValue({ db: null, loading: true, error: null, progress: 50 });
    await userEvent.click(screen.getByRole('button', { name: 'nudge' }));

    expect(Number(screen.getByTestId('progress').textContent))
      .toBeCloseTo(downloadProgress(50, 2000), 5);
    now.mockRestore();
  });
});
