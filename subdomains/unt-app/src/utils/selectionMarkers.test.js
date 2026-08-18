import { runMarkers, markerClassNames } from './selectionMarkers';

const years = [2026, 2025, 2024, 2023, 2022];
const markersFor = (selected) => runMarkers(years, (y) => selected.includes(y));

describe('runMarkers', () => {
    it('marks a single year at both edges', () => {
        const markers = markersFor([2024]);
        expect(markers[2]).toEqual({ marked: true, start: true, end: true });
        expect(markers[1].marked).toBe(false);
        expect(markers[3].marked).toBe(false);
    });

    // Neighbouring selected years must read as one block, so only the outer
    // edges of the run carry a marker.
    it('merges neighbouring years into one block', () => {
        const markers = markersFor([2025, 2024, 2023]);
        expect(markers[1]).toEqual({ marked: true, start: true, end: false });
        expect(markers[2]).toEqual({ marked: true, start: false, end: false });
        expect(markers[3]).toEqual({ marked: true, start: false, end: true });
    });

    it('keeps two runs apart when a year between them is off', () => {
        const markers = markersFor([2026, 2024]);
        expect(markers[0]).toEqual({ marked: true, start: true, end: true });
        expect(markers[1].marked).toBe(false);
        expect(markers[2]).toEqual({ marked: true, start: true, end: true });
    });

    it('closes a run that reaches the first or the last column', () => {
        const markers = markersFor([2026, 2025]);
        expect(markers[0].start).toBe(true);
        expect(markers[1].end).toBe(true);

        const tail = markersFor([2023, 2022]);
        expect(tail[3].start).toBe(true);
        expect(tail[4].end).toBe(true);
    });

    it('marks nothing when no year is selected', () => {
        expect(markersFor([]).every(m => !m.marked)).toBe(true);
    });
});

describe('markerClassNames', () => {
    it('names the start and the end of a run', () => {
        expect(markerClassNames({ marked: true, start: true, end: true }, 'year'))
            .toBe(' year-marked year-marked-start year-marked-end');
        expect(markerClassNames({ marked: true, start: false, end: false }, 'year'))
            .toBe(' year-marked');
        expect(markerClassNames({ marked: true, start: true, end: false }, 'sem'))
            .toBe(' sem-marked sem-marked-start');
    });

    it('names nothing for an unmarked item', () => {
        expect(markerClassNames({ marked: false, start: false, end: false }, 'year')).toBe('');
        expect(markerClassNames(undefined, 'year')).toBe('');
    });
});
