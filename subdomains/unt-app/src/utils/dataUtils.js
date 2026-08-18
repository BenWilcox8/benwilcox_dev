// Helper function to execute a query and return results
const executeQuery = async (db, query, params = []) => {
    try {
        const stmt = db.prepare(query);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error("Query failed:", query, e);
        return [];
    }
};

// ---------------------------------------------------------------------------
// Per-course read cache.
//
// The same course's catalog rows and offering rows are read by Course Display 1,
// Course Display 2, Course Details and the Course Group Selector. Without a
// cache each of those reads re-materialises thousands of rows out of sql.js on
// the main thread. The cache is keyed on the database handle, so a new database
// starts with an empty cache and the old one is collected with it.
//
// The cached arrays are shared. Treat them as read-only: copy before you sort.
// ---------------------------------------------------------------------------
const courseCaches = new WeakMap();

const cacheFor = (db) => {
    let cache = courseCaches.get(db);
    if (!cache) {
        cache = { catalog: new Map(), offerings: new Map() };
        courseCaches.set(db, cache);
    }
    return cache;
};

// Store the promise, not the rows, so concurrent callers share one read.
// A rejected read is evicted so a later call retries instead of replaying
// the failure. Exported for its test only.
export const readThrough = (store, key, read) => {
    let entry = store.get(key);
    if (!entry) {
        entry = read();
        store.set(key, entry);
        entry.catch(() => {
            if (store.get(key) === entry) store.delete(key);
        });
    }
    return entry;
};

export const fetchAllCourses = async (db) => {
    const query = "SELECT * FROM MainCourses ORDER BY main_course_id";
    return executeQuery(db, query);
};

export const fetchAllCatalogForCourse = (db, mainCourseId) =>
    readThrough(cacheFor(db).catalog, mainCourseId, () =>
        executeQuery(db, "SELECT * FROM AllCatalog WHERE main_course_id = ?", [mainCourseId]));

export const fetchAllOfferingsForCatalogIds = async (db, catalogIds) => {
    if (catalogIds.length === 0) return [];
    const placeholders = catalogIds.map(() => '?').join(',');
    const query = `SELECT * FROM AllOfferings WHERE main_catalog_id IN (${placeholders})`;
    return executeQuery(db, query, catalogIds);
};

export const fetchOfferingsForCourse = (db, mainCourseId) =>
    readThrough(cacheFor(db).offerings, mainCourseId, async () => {
        const catalogEntries = await fetchAllCatalogForCourse(db, mainCourseId);
        const catalogIds = catalogEntries.map(c => c.main_catalog_id);
        return fetchAllOfferingsForCatalogIds(db, catalogIds);
    });

// Catalog rows and offering rows of one course, both from the cache.
// `selection` is the courseGroupSelection map. A catalog id counts as selected
// until the user clears it, which is what every caller did on its own before.
export const fetchCourseData = async (db, mainCourseId, selection) => {
    const [catalog, offerings] = await Promise.all([
        fetchAllCatalogForCourse(db, mainCourseId),
        fetchOfferingsForCourse(db, mainCourseId),
    ]);
    if (!selection) return { catalog, offerings, selectedCatalog: catalog, selectedOfferings: offerings };

    const selectedCatalog = catalog.filter(c => selection[c.main_catalog_id] !== false);
    if (selectedCatalog.length === catalog.length) {
        return { catalog, offerings, selectedCatalog: catalog, selectedOfferings: offerings };
    }
    const selectedIds = new Set(selectedCatalog.map(c => c.main_catalog_id));
    const selectedOfferings = selectedCatalog.length === 0
        ? []
        : offerings.filter(o => selectedIds.has(o.main_catalog_id));
    return { catalog, offerings, selectedCatalog, selectedOfferings };
};

export const fetchFacultyById = async (db, facultyId) => {
    const query = "SELECT * FROM Faculty WHERE main_faculty_id = ?";
    const result = await executeQuery(db, query, [facultyId]);
    return result[0];
};

// Offering count of every catalog entry of one course, in a single pass over
// the cached offering rows. The Course Group Selector used to run one COUNT(*)
// per catalog entry.
export const fetchOfferingCountsForCourse = async (db, mainCourseId) => {
    const offerings = await fetchOfferingsForCourse(db, mainCourseId);
    const counts = new Map();
    for (const offering of offerings) {
        const id = offering.main_catalog_id;
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
};

export const fetchAllCatalogForSearch = async (db) => {
    const query = "SELECT DISTINCT course_code, course_name, main_course_id FROM AllCatalog";
    return executeQuery(db, query);
};
