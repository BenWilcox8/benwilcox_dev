import { CURRENT_YEAR } from '../config';

// The year columns of Course Display 1.
//
// This is a property of the whole display, not of one row. Both SemesterView
// and SemesterViewHeader used to derive it separately, once per rendered row,
// which made every course added to the display cost work proportional to the
// number of courses already there.
//
// `courseData` is one entry per course in the display, each with `catalog` and
// `offerings` arrays.
export const computeDisplayYears = (courseData, showAllYears) => {
    const listedYears = new Set();
    const offeringYears = new Set();

    for (const { catalog, offerings } of courseData) {
        for (const entry of catalog) listedYears.add(entry.catalog_year);
        for (const offering of offerings) offeringYears.add(offering.year);
    }

    if (!showAllYears || listedYears.size === 0) {
        return [...offeringYears].sort((a, b) => b - a);
    }

    const earliestCatalogYear = Math.min(...listedYears);
    const earliestOfferingYear = offeringYears.size > 0
        ? Math.min(...offeringYears)
        : earliestCatalogYear;
    const earliestYear = Math.min(earliestCatalogYear, earliestOfferingYear) - 1;

    return Array.from(
        { length: CURRENT_YEAR - earliestYear + 1 },
        (_, i) => CURRENT_YEAR - i,
    );
};

// True when two year lists hold the same years in the same order.
export const sameYears = (a, b) =>
    a.length === b.length && a.every((year, i) => year === b[i]);
