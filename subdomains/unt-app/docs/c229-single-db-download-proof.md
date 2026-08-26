## Evidence: single /courses.db request per development page load

### What was verified

The `useDatabase` hook previously started the 87 MB `/courses.db` fetch inside a
plain `useEffect` with no in-flight guard.
React StrictMode (active in development via `src/index.js`) double-invokes mount
effects, which caused two separate 87 MB network requests on every development page
load.

The fix adds a module-level singleton (`_load`) in `src/hooks/useDatabase.js`.
The singleton stores the in-flight promise the moment the first effect fires.
When the second mount fires, it finds `_load` already set and reuses the same
promise instead of starting a second fetch.

### End-to-end run (2026-08-20)

Browser: Chromium 150.0.7871.181, headless, remote debugging on port 9222.
App: development build (`npm start`) at http://localhost:3000.
Method: Node.js 24 CDP client - enabled `Network.enable`, navigated to the app,
collected `Network.requestWillBeSent` events for 8 seconds.

```
Connecting to: ws://127.0.0.1:9222/devtools/page/32372A00A3A77C08A242AD3EA6107D71
Navigating to http://localhost:3000 ...
Waiting 8000ms for network events...
  [1] request: http://localhost:3000/courses.db

Result:
  /courses.db requests: 1
  PASS: exactly one request - double-download guard is working
```

Exactly one request for `/courses.db` was recorded.

### Unit test confirmation

`src/hooks/useDatabase.test.js` - "fetches /courses.db exactly once when the effect
mounts twice" - wraps `renderHook` in `React.StrictMode` and asserts
`global.fetch` called exactly once.

All 149 project tests pass.
