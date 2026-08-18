import { computeDisplayYears, sameYears } from './displayYears';
import { CURRENT_YEAR } from '../config';

const course = (catalogYears, offeringYears) => ({
    catalog: catalogYears.map(catalog_year => ({ catalog_year })),
    offerings: offeringYears.map(year => ({ year })),
});

describe('computeDisplayYears', () => {
    it('runs from the current year back to one year before the earliest record', () => {
        const years = computeDisplayYears([course([2020, 2021], [2021, 2022])], true);
        expect(years[0]).toBe(CURRENT_YEAR);
        expect(years[years.length - 1]).toBe(2019);
    });

    it('takes the earliest year from the offerings when they start before the catalog', () => {
        const years = computeDisplayYears([course([2020], [2015])], true);
        expect(years[years.length - 1]).toBe(2014);
    });

    it('shows only the years with offerings when "show all years" is off', () => {
        const years = computeDisplayYears([course([2020], [2018, 2020, 2019])], false);
        expect(years).toEqual([2020, 2019, 2018]);
    });

    it('returns no years for an empty display', () => {
        expect(computeDisplayYears([], true)).toEqual([]);
    });

    // The Course Display 1 slowness of the c108 audit came from every row
    // deriving this list on its own. The list is a property of the display, so
    // adding a course that widens nothing must leave it unchanged.
    it('does not depend on how many courses hold the same years', () => {
        const one = computeDisplayYears([course([2018], [2019])], true);
        const many = computeDisplayYears(
            Array.from({ length: 40 }, () => course([2018], [2019])), true);
        expect(many).toEqual(one);
    });

    it('widens only when a course reaches further back', () => {
        const narrow = computeDisplayYears([course([2018], [2019])], true);
        const wide = computeDisplayYears(
            [course([2018], [2019]), course([2005], [2006])], true);
        expect(wide.length).toBeGreaterThan(narrow.length);
        expect(wide[wide.length - 1]).toBe(2004);
    });
});

describe('sameYears', () => {
    it('is true for equal lists and false otherwise', () => {
        expect(sameYears([2026, 2025], [2026, 2025])).toBe(true);
        expect(sameYears([2026, 2025], [2025, 2026])).toBe(false);
        expect(sameYears([2026], [2026, 2025])).toBe(false);
    });
});
