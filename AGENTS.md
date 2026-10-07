# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Layout

The repository is a monorepo of independent sites, one directory per subdomain under `subdomains/`.
Each site has its own `package.json` and its own dependencies. Run every command from inside the site directory, not from the root.
Repository-level agent definitions live in `.claude/agents/`; `adversarial-reviewer.md` there defines the adversarial pre-merge review agent, which refutes a change and never edits it.

## unt-app

The UNT course viewer, served at https://www.unt.benwilcox.dev.
React 19 with `react-scripts`. Commands: `npm ci`, `npm start`, `npm test`, `npm run build`.

### Sharp edges

**Tailwind classes do nothing.**
`tailwindcss` and `postcss` are development dependencies, but there is no `tailwind.config.js`, no `postcss.config.js`, and no `@tailwind` directive in any CSS file.
Class names such as `flex items-center`, `space-x-2` and `h-4 w-4` are inert wherever they still appear.
Write real CSS. Do not assume a utility class has any effect.

**The database is read into memory in the browser.**
`public/courses.db` is loaded by `src/hooks/useDatabase.js` through sql.js, and sql.js itself comes from a CDN `<script>` in `public/index.html`.
The app therefore needs network access on first load, even when it is served locally.

**Cached rows are shared and read-only.**
`src/utils/dataUtils.js` caches the catalog rows and the offering rows of each course, keyed on the database handle.
Every caller gets the same array. Copy it before you sort or reverse it.

**The Course Display 1 year columns belong to the display, not to a row.**
`displayYears` is computed once in `src/contexts/AppContext.js` and read by `SemesterView` and `SemesterViewHeader`.
Deriving it inside a row makes the cost of adding a course grow with the square of the course count.
See `src/utils/displayYears.js` and its test.

**catalog.unt.edu sits behind AWS WAF; plain HTTP scraping breaks.**
The `creating_data` pipeline's search-endpoint scrape (script 3) is always blocked for non-browser clients (empty HTTP 202), and course preview pages get blocked mid-run once request volume rises.
Real browser navigation always passes.
When a data refresh hits 202s, drive a headless Chromium (chrome-devtools-axi) to the pages and parse the DOM, or reuse prior-generation rows by Course Link - archived catalog pages never change.
Per-refresh operator constants live in `creating_data/2_generate_all_offerings.py` (CURRENT_SEMESTER/CURRENT_YEAR) and `src/config.js`; update both each refresh.

**The creating_data venv needs system libraries on NixOS.**
pip-installed numpy/pandas wheels fail to import without `LD_LIBRARY_PATH` pointing at nix-store `gcc-*-lib/lib` (libstdc++) and `zlib-*/lib` (libz).
Scripts 1-5 and 7 run without it; script 6 (pandas) does not.

**facultyinfo.unt.edu forgets a professor who leaves; the snapshots do not.**
Each scrape is kept as a dated gzip pair in `creating_data/snapshots/`, and step `2b_merge_scrapes.py` rebuilds `faculty.csv` and the offerings that step 5 pairs from all of them, matched by the `profile=<euid>` in the link, never by name or Faculty ID.
A refresh therefore adds a snapshot (`--add-snapshot YYYY-MM-DD`) instead of overwriting the old scrape; the procedure is in `creating_data/README.md`.
In the app, every read of offerings goes through `fetchCourseData`/`fetchOfferingsForCourse` with the `includeFormerProfessors` toggle, so a new reader of offerings must pass it too or former professors leak past the toggle.

**facultyinfo.unt.edu drops about one profile per full scrape.**
Each 3,039-page pass of script 2 tends to lose a different single faculty profile to a transient connect timeout, logged in `errors.csv`.
Retrying trades one missing profile for another; accept the logged miss rather than looping.

**Nothing painted after the download is seen unless it is forced there.**
Once the database bytes land, opening the file, reading the courses and the catalog and building the search index hold the main thread for several hundred milliseconds in one stretch.
A React state update made in that window is only scheduled, so the browser can reach its next frame with the old value still in the document and the reader never sees the new one.
Anything that must be on the screen for that stretch has to be written with `flushSync` and then given an animation frame to draw, which is what `paintLoading` in `src/contexts/AppContext.js` is for.
`flushSync` does nothing inside React's commit, so a caller reached straight from an effect body has to leave it first.
The loading bar is scaled with a transform rather than resized, because a width transition is laid out on the main thread and freezes part way through that stretch while a transform transition is run by the compositor.
Where the bar should be is not a fixed weighting per stage but a projection from the rate the file is arriving at, so it reads the same on a slow connection and a local build; see `src/utils/loadingProgress.js` and its test.

**The loading gate belongs to the main page, not to the site.**
`src/APP.js` puts the router above the gate and the gate inside the `/` route only, so `/info` is readable at any download state.
`AppProvider` sits above the router in `src/index.js`, which is why moving between the two routes neither restarts nor interrupts the download.
For the same reason every in-app link on the information page has to be a router `Link`: a plain `<a href="/">` reloads the site and starts the whole database download again.
The one exception is the header `Info/Data` link while the tutorial is running, which opens a second tab on purpose rather than leaving the page the tutorial is running on.
The gate is held by `appLoading`, which is cleared when the app can be used, not when the database opens, and is released early on a failure in either half of the wait.

**The database is downloaded once per page load, in development and production.**
`useDatabase` holds a module-level singleton (`_load`) that stores the in-flight promise.
`src/index.js` wraps the provider in `React.StrictMode`, which double-invokes mount effects in development, but the second mount finds the singleton and reuses the same promise instead of starting a second fetch.
A subscriber `Set` in the singleton lets both mount instances receive streaming progress updates from the single request.
`_resetLoad` is exported for unit tests to clear the singleton between cases.

**The test runner cannot resolve `react-router-dom` on its own.**
Version 7 ships an `exports` map and no `main`, and the jest that comes with `react-scripts` does not read `exports`.
`package.json` maps it to `react-router`, which has a `main` and re-exports everything this app uses, and `src/setupTests.js` polyfills `TextEncoder`, which react-router reaches for on import and that jsdom does not provide.
Both exist so a test can render anything containing a `Link`.
`sql.js` is a dev dependency at the CDN version, so a test can open a real database with the schema of step 7; `src/components/FormerProfessors.test.js` shows how, including the mock that `react-dnd` needs because it ships only as ES modules.

### The first-visit tutorial reads the page through class names

`src/tutorial/` puts a guided overlay on top of the working page.
It holds no refs inside the feature components: it finds what it points at with the class names those components render, all of them collected in `src/tutorial/tutorialDom.js`.
That file is the only list, and it is longer than the elements the arrows land on: it also queries the containers it searches inside and the state classes it reads.
The containers are `.all-courses-list`, `.course-display1-list`, `.semester-view-header-timeline`, `.specific-courses-display` and `.header-container` with its `.top-right` and `.bottom-right`.
The targets are `.course-item` and `.course-item-text`, `.course-row`, `.year-column`, `.year-column-header`, `.semester-cell`, `.semester-bar` and `.specific-semester-bar`, `.specifier-box` and `.specifier-list`, `.granular-view-container`, `.course-info`, `.course-cell`, `.course-name-link`, `.course-details-description`, `.course-details-links`, `.share-button-header`, `.tutorial-header-link`, the `/info` link of the header, and the `course-count` and `former-professors` checkbox ids with their `.checkbox-row`.
The state classes are `filled` on a semester bar and `listed`/`unlisted`/`pre-2011` on a year column.
If you rename any of them, update `tutorialDom.js` in the same change, and look at `REAL_ACTION_SELECTORS` there as well: it is a second list of the same kind, naming everything a click can change, so that a click which does something to the app never counts as 'read this step, move on'.
The steps themselves are data in `src/tutorial/tutorialConfig.js`; a new part is a new entry there, not a framework change.
The tutorial runs on the desktop layout only.
`src/tutorial/tutorialStorage.js` stores a `tutorial-seen` flag in localStorage so the tutorial auto-plays only once per browser.
It auto-plays again in incognito windows, after the user clears site data, and in other browsers.
When localStorage is unavailable (blocked or private modes that throw), the module falls back to an in-memory flag for the life of the loaded page and does not crash.
The `Tutorial` button in the header replays the tutorial on demand regardless of the flag.

The section it highlights is the real element, lifted out of the dimming sheet by a `z-index` on the element itself (`.tutorial-focus`), which is why the lit shape cannot lag behind a panel drag.
That works because nothing between the panels and the root creates a stacking context.
Adding a `transform`, `filter`, `opacity` below 1 or `contain` to `.app-container`, a pane or a panel group would trap the section below the sheet and break the highlight.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
