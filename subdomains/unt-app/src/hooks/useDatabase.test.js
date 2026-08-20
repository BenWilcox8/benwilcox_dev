import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useDatabase, { _resetLoad } from './useDatabase';

const mockBuffer = new Uint8Array([1, 2, 3]).buffer;

const mockSql = {
  Database: jest.fn().mockReturnValue({ exec: jest.fn() }),
};

const mockFetchNoStream = () =>
  Promise.resolve({
    headers: { get: () => null },
    body: null,
    arrayBuffer: () => Promise.resolve(mockBuffer),
  });

beforeEach(() => {
  _resetLoad();
  global.window.initSqlJs = jest.fn().mockResolvedValue(mockSql);
  global.fetch = jest.fn(mockFetchNoStream);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useDatabase', () => {
  it('fetches /courses.db exactly once when the effect mounts twice', async () => {
    // React StrictMode mounts effects twice in development. The singleton guard
    // must ensure fetch is still called only once.
    const { result } = renderHook(() => useDatabase(), {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/courses.db');
    expect(result.current.loading).toBe(false);
    expect(result.current.db).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reports progress of 100 when the download completes', async () => {
    const { result } = renderHook(() => useDatabase());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.progress).toBe(100);
  });

  it('surfaces an error and clears loading when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useDatabase());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.db).toBeNull();

    console.error.mockRestore();
  });
});
