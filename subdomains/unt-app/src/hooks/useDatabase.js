import { useState, useEffect } from 'react';

// Module-level singleton: one fetch regardless of how many times the hook
// mounts (React StrictMode mounts effects twice in development). A Set of
// progress listeners lets every active component instance receive the same
// streaming updates from the single in-flight request.
let _load = null;

// Reset the singleton between unit test cases.
export const _resetLoad = () => { _load = null; };

const ensureLoad = () => {
  if (_load) return _load;

  const listeners = new Set();
  let lastProgress = 0;

  const broadcast = (value) => {
    lastProgress = value;
    listeners.forEach(cb => cb(value));
  };

  const promise = (async () => {
    try {
      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
      });

      const response = await fetch('/courses.db');
      const contentLength = response.headers.get('Content-Length');
      if (!response.body || !contentLength) {
        const buffer = await response.arrayBuffer();
        broadcast(100);
        return { database: new SQL.Database(new Uint8Array(buffer)), err: null };
      }

      const total = parseInt(contentLength, 10);
      const reader = response.body.getReader();
      let received = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        broadcast(Math.round((received / total) * 100));
      }
      const concatenated = new Uint8Array(received);
      let position = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, position);
        position += chunk.length;
      }
      return { database: new SQL.Database(concatenated), err: null };
    } catch (err) {
      console.error('Failed to load database:', err);
      return { database: null, err };
    }
  })();

  _load = {
    promise,
    listeners,
    get lastProgress() { return lastProgress; },
  };
  return _load;
};

// The 87MB course database, downloaded only when a page that is made of it
// asks. `enabled` is what asks: until it turns true nothing is fetched, so a
// tab that only ever shows the information page pulls neither the file nor the
// sql.js runtime that parses it.
const useDatabase = (enabled) => {
  const [db, setDb] = useState(null);
  // False until the download starts, because before the request there is no
  // download to be part way through - only one that will never happen.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);

    const state = ensureLoad();

    // Catch up any progress already reported before this mount registered.
    if (state.lastProgress > 0) setProgress(state.lastProgress);
    state.listeners.add(setProgress);

    let active = true;
    state.promise.then(({ database, err }) => {
      if (!active) return;
      if (err) setError(err);
      else setDb(database);
      setLoading(false);
    });

    return () => {
      active = false;
      state.listeners.delete(setProgress);
    };
  }, [enabled]);

  return { db, loading, error, progress };
};

export default useDatabase;
