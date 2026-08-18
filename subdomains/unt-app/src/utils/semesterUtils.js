// The four broad semesters, in the order the Course Display 1 rows show them.
export const BROAD_SEMESTERS = ['Fall', 'Summer', 'Spring', 'Winter'];

// The columns of public/semester_mapping.csv.
const SPECIFIC = 'Specific Semester';
const BROAD = 'Broad Semester';
const ORDER = 'Semester Order';

// specific semester -> broad semester
export const buildBroadSemesterMap = (semesterMapping) => {
    const map = new Map();
    if (!semesterMapping) return map;
    for (const row of semesterMapping) map.set(row[SPECIFIC], row[BROAD]);
    return map;
};

// specific semester -> sort order
export const buildSemesterOrderMap = (semesterMapping) => {
    const map = new Map();
    if (!semesterMapping) return map;
    for (const row of semesterMapping) map.set(row[SPECIFIC], row[ORDER]);
    return map;
};

// Sort the specific semesters of one broad semester into mapping order.
// Names the mapping does not hold fall back to alphabetical order.
export const sortSpecificSemesters = (specificSemesters, semesterMapping, broadSemester) => {
    if (!semesterMapping || semesterMapping.length === 0) return specificSemesters;

    const order = new Map();
    for (const row of semesterMapping) {
        if (row[BROAD] === broadSemester) order.set(row[SPECIFIC], row[ORDER]);
    }

    return [...specificSemesters].sort((a, b) => {
        const orderA = order.get(a);
        const orderB = order.get(b);
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
        return a.localeCompare(b);
    });
};
