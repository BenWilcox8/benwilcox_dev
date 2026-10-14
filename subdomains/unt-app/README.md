# UNT Historical Courses

https://www.unt.benwilcox.dev

A website that shows when each University of North Texas (UNT) course was offered and which professors taught it.
The data comes from the UNT course catalogs ([catalog.unt.edu](https://catalog.unt.edu)) and the faculty profiles ([facultyinfo.unt.edu](https://facultyinfo.unt.edu)).
The [Info/Data page](https://www.unt.benwilcox.dev/info) explains each part of the site and the limits of the data.

## Layout

| Path | Contents |
|---|---|
| [`src/`](src) | The React app. |
| [`public/`](public) | Static files. `courses.db` is the SQLite database that the app downloads and reads in the browser. |
| [`creating_data/`](creating_data) | The Python scripts that scrape and process the data, the output CSV files, and the dated snapshots of each facultyinfo.unt.edu scrape. Its [README](creating_data/README.md) explains each step and how to refresh the data. |
| [`docs/`](docs) | Notes about the design of the app. |

## Commands

Run these commands in this folder:

* `npm ci` installs the dependencies.
* `npm start` starts the development server.
* `npm test` runs the tests.
* `npm run build` makes the production build.
