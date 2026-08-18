# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Layout

The repository is a monorepo of independent sites, one directory per subdomain under `subdomains/`.
Each site has its own `package.json` and its own dependencies. Run every command from inside the site directory, not from the root.

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

**facultyinfo.unt.edu drops about one profile per full scrape.**
Each 3,039-page pass of script 2 tends to lose a different single faculty profile to a transient connect timeout, logged in `errors.csv`.
Retrying trades one missing profile for another; accept the logged miss rather than looping.

### The first-visit tutorial reads the page through class names

`src/tutorial/` puts a guided overlay on top of the working page.
It holds no refs inside the feature components: it finds what it points at with the class names those components render, all of them collected in `src/tutorial/tutorialDom.js`.
If you rename `.semester-bar`, `.year-column` and its `listed`/`unlisted`/`pre-2011` states, `.course-item`, `.course-row`, `.year-column-header` or the `course-count` checkbox id, update that file in the same change.
The steps themselves are data in `src/tutorial/tutorialConfig.js`; a new part is a new entry there, not a framework change.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
