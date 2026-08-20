import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppContext, AppProvider } from './AppContext';
import useDatabase from '../hooks/useDatabase';
import { fetchAllCourses, fetchAllCatalogForSearch } from '../utils/dataUtils';

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
