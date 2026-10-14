import { sortOfferings } from './sortingUtils';

const row = (specific, broad, order) => ({
    'Specific Semester': specific,
    'Broad Semester': broad,
    'Semester Order': order,
});

const MAPPING = [
    row('Fall', 'Fall', 0),
    row('Fall 8W1', 'Fall', 4),
    row('Summer 3W1', 'Summer', 9),
    row('Summer 10W', 'Summer', 10),
    row('Spring', 'Spring', 18),
];

const offering = (year, specific_semester, id = `${year} ${specific_semester}`) =>
    ({ id, year, specific_semester });

const ids = list => list.map(o => o.id);

describe('sortOfferings', () => {
    it('puts the newest year first', () => {
        const sorted = sortOfferings(
            [offering(2019, 'Fall'), offering(2023, 'Fall'), offering(2021, 'Fall')], MAPPING);
        expect(sorted.map(o => o.year)).toEqual([2023, 2021, 2019]);
    });

    it('sorts the offerings of one year into mapping order', () => {
        const sorted = sortOfferings([
            offering(2022, 'Spring'),
            offering(2022, 'Summer 10W'),
            offering(2022, 'Fall 8W1'),
            offering(2022, 'Summer 3W1'),
            offering(2022, 'Fall'),
        ], MAPPING);
        expect(ids(sorted)).toEqual([
            '2022 Fall', '2022 Fall 8W1', '2022 Summer 3W1', '2022 Summer 10W', '2022 Spring',
        ]);
    });

    it('sorts by year before semester', () => {
        const sorted = sortOfferings(
            [offering(2020, 'Fall'), offering(2021, 'Spring')], MAPPING);
        expect(ids(sorted)).toEqual(['2021 Spring', '2020 Fall']);
    });

    it('puts semesters the mapping does not hold last in their year', () => {
        const sorted = sortOfferings([
            offering(2022, 'Fall ZZ'),
            offering(2022, 'Spring'),
            offering(2021, 'Fall'),
            offering(2022, 'Fall'),
        ], MAPPING);
        expect(ids(sorted)).toEqual(['2022 Fall', '2022 Spring', '2022 Fall ZZ', '2021 Fall']);
    });

    // Two sections of the same course in the same semester.
    it('keeps the input order of offerings that compare equal', () => {
        const sorted = sortOfferings([
            offering(2022, 'Fall', 'a'),
            offering(2022, 'Fall', 'b'),
            offering(2022, 'Fall ZZ', 'c'),
            offering(2022, 'Fall YY', 'd'),
        ], MAPPING);
        expect(ids(sorted)).toEqual(['a', 'b', 'c', 'd']);
    });

    // The offerings come from the cached rows of dataUtils, which every caller shares.
    it('returns a new array and does not reorder its input', () => {
        const input = [offering(2019, 'Fall'), offering(2023, 'Fall')];
        const sorted = sortOfferings(input, MAPPING);
        expect(sorted).not.toBe(input);
        expect(input.map(o => o.year)).toEqual([2019, 2023]);
        expect(sorted[0]).toBe(input[1]);
    });

    it('returns an empty list when there are no offerings', () => {
        expect(sortOfferings([], MAPPING)).toEqual([]);
        expect(sortOfferings(null, MAPPING)).toEqual([]);
        expect(sortOfferings(undefined, MAPPING)).toEqual([]);
    });
});
