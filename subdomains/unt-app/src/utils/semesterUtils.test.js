import {
    BROAD_SEMESTERS,
    buildBroadSemesterMap,
    buildSemesterOrderMap,
    sortSpecificSemesters,
} from './semesterUtils';

// Rows as Papa.parse gives them for public/semester_mapping.csv:
// header keys, and a number for the order because of dynamicTyping.
const row = (specific, broad, order) => ({
    'Specific Semester': specific,
    'Broad Semester': broad,
    'Semester Order': order,
});

const MAPPING = [
    row('Fall', 'Fall', 0),
    row('Fall 4W2', 'Fall', 1),
    row('Fall 8W1', 'Fall', 4),
    row('Summer 3W1', 'Summer', 9),
    row('Summer 10W', 'Summer', 10),
    row('Spring', 'Spring', 18),
    row('Spring 3W1', 'Winter', 28),
];

describe('BROAD_SEMESTERS', () => {
    it('lists the four broad semesters in the row order of Course Display 1', () => {
        expect(BROAD_SEMESTERS).toEqual(['Fall', 'Summer', 'Spring', 'Winter']);
    });
});

describe('buildBroadSemesterMap', () => {
    it('maps each specific semester to its broad semester', () => {
        const map = buildBroadSemesterMap(MAPPING);
        expect(map.get('Fall 8W1')).toBe('Fall');
        expect(map.get('Summer 10W')).toBe('Summer');
        expect(map.size).toBe(MAPPING.length);
    });

    // The name of a specific semester does not always start with its broad semester.
    it('reads the broad semester from the mapping, not from the name', () => {
        expect(buildBroadSemesterMap(MAPPING).get('Spring 3W1')).toBe('Winter');
    });

    it('gives no broad semester for a name the mapping does not hold', () => {
        expect(buildBroadSemesterMap(MAPPING).get('Fall ZZ')).toBeUndefined();
    });

    it('returns an empty map before the mapping has loaded', () => {
        expect(buildBroadSemesterMap([]).size).toBe(0);
        expect(buildBroadSemesterMap(null).size).toBe(0);
        expect(buildBroadSemesterMap(undefined).size).toBe(0);
    });
});

describe('buildSemesterOrderMap', () => {
    it('maps each specific semester to its sort order', () => {
        const map = buildSemesterOrderMap(MAPPING);
        expect(map.get('Fall 4W2')).toBe(1);
        expect(map.get('Spring 3W1')).toBe(28);
        expect(map.size).toBe(MAPPING.length);
    });

    it('keeps an order of 0 as a real order', () => {
        const map = buildSemesterOrderMap(MAPPING);
        expect(map.has('Fall')).toBe(true);
        expect(map.get('Fall')).toBe(0);
    });

    it('returns an empty map before the mapping has loaded', () => {
        expect(buildSemesterOrderMap([]).size).toBe(0);
        expect(buildSemesterOrderMap(null).size).toBe(0);
        expect(buildSemesterOrderMap(undefined).size).toBe(0);
    });
});

describe('sortSpecificSemesters', () => {
    it('sorts the semesters of one broad semester into mapping order', () => {
        expect(sortSpecificSemesters(['Fall 8W1', 'Fall', 'Fall 4W2'], MAPPING, 'Fall'))
            .toEqual(['Fall', 'Fall 4W2', 'Fall 8W1']);
    });

    // Alphabetical order puts "Summer 10W" first. The mapping does not.
    it('follows the mapping where it differs from alphabetical order', () => {
        expect(sortSpecificSemesters(['Summer 10W', 'Summer 3W1'], MAPPING, 'Summer'))
            .toEqual(['Summer 3W1', 'Summer 10W']);
    });

    it('uses the order of a semester under its own broad semester only', () => {
        // Under Spring, the Winter row of "Spring 3W1" gives it no order.
        expect(sortSpecificSemesters(['Spring 3W2', 'Spring 3W1'],
            [...MAPPING, row('Spring 3W2', 'Winter', 27)], 'Spring'))
            .toEqual(['Spring 3W1', 'Spring 3W2']);
    });

    it('sorts names the mapping does not hold alphabetically', () => {
        expect(sortSpecificSemesters(['Fall ZZ', 'Fall AA', 'Fall MM'], MAPPING, 'Fall'))
            .toEqual(['Fall AA', 'Fall MM', 'Fall ZZ']);
    });

    it('returns a new array and does not reorder its input', () => {
        const input = ['Fall 8W1', 'Fall'];
        const sorted = sortSpecificSemesters(input, MAPPING, 'Fall');
        expect(sorted).not.toBe(input);
        expect(input).toEqual(['Fall 8W1', 'Fall']);
    });

    it('returns an empty list for a broad semester with no offerings', () => {
        expect(sortSpecificSemesters([], MAPPING, 'Winter')).toEqual([]);
    });

    it('keeps the input order before the mapping has loaded', () => {
        const input = ['Fall 8W1', 'Fall'];
        expect(sortSpecificSemesters(input, [], 'Fall')).toEqual(['Fall 8W1', 'Fall']);
        expect(sortSpecificSemesters(input, null, 'Fall')).toEqual(['Fall 8W1', 'Fall']);
    });
});
