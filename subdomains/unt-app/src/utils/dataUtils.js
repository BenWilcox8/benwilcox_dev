import { visibleOfferings } from './formerProfessors';

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
        // `currentOfferings` holds the offerings without former professors,
        // for when the "Include Former Professors" toggle is off.
        cache = { catalog: new Map(), offerings: new Map(), currentOfferings: new Map() };
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

// Each offering row also carries `faculty_former` (0 or 1) from its professor.
export const fetchAllOfferingsForCatalogIds = async (db, catalogIds) => {
    if (catalogIds.length === 0) return [];
    const placeholders = catalogIds.map(() => '?').join(',');
    const query = `SELECT o.*, COALESCE(f.faculty_former, 0) AS faculty_former
        FROM AllOfferings o
        LEFT JOIN Faculty f ON f.main_faculty_id = o.main_faculty_id
        WHERE o.main_catalog_id IN (${placeholders})`;
    return executeQuery(db, query, catalogIds);
};

// All offerings of one course, or only those of current professors when
// `includeFormer` is false. Both lists are cached, so each keeps its identity.
export const fetchOfferingsForCourse = (db, mainCourseId, includeFormer = true) => {
    const cache = cacheFor(db);
    const all = readThrough(cache.offerings, mainCourseId, async () => {
        const catalogEntries = await fetchAllCatalogForCourse(db, mainCourseId);
        const catalogIds = catalogEntries.map(c => c.main_catalog_id);
        return fetchAllOfferingsForCatalogIds(db, catalogIds);
    });
    if (includeFormer) return all;
    return readThrough(cache.currentOfferings, mainCourseId,
        async () => visibleOfferings(await all, false));
};

// Catalog rows and offering rows of one course, both from the cache.
// `selection` is the courseGroupSelection map. A catalog id counts as selected
// until the user clears it, which is what every caller did on its own before.
// `includeFormer` is the "Include Former Professors" toggle: when it is false,
// the sections of former professors are left out of every list returned.
export const fetchCourseData = async (db, mainCourseId, selection, includeFormer = true) => {
    const [catalog, offerings] = await Promise.all([
        fetchAllCatalogForCourse(db, mainCourseId),
        fetchOfferingsForCourse(db, mainCourseId, includeFormer),
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
export const fetchOfferingCountsForCourse = async (db, mainCourseId, includeFormer = true) => {
    const offerings = await fetchOfferingsForCourse(db, mainCourseId, includeFormer);
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
