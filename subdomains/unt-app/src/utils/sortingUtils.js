// src/utils/sortingUtils.js
import { buildSemesterOrderMap } from './semesterUtils';

// Offerings, newest year first, then by semester order.
// Returns a new array: the cached offering rows must not be reordered.
export const sortOfferings = (offerings, semesterMapping) => {
    if (!offerings || offerings.length === 0 || !semesterMapping || semesterMapping.length === 0) {
        return [];
    }

    const order = buildSemesterOrderMap(semesterMapping);

    return [...offerings].sort((a, b) => {
        // Primary sort: by year, descending (more recent years first)
        if (a.year !== b.year) {
            return b.year - a.year;
        }

        const orderA = order.get(a.specific_semester);
        const orderB = order.get(b.specific_semester);

        // Semesters the mapping does not hold go to the end.
        if (orderA === undefined && orderB === undefined) return 0;
        if (orderA === undefined) return 1;
        if (orderB === undefined) return -1;

        // Secondary sort: by specific semester order (ascending - lower numbers first)
        return orderA - orderB;
    });
};
