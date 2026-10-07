import { formerProfessorTitle, monthYear, visibleOfferings } from './formerProfessors';

describe('monthYear', () => {
  it('names the month of a scrape date without shifting it a day', () => {
    expect(monthYear('2026-03-01')).toBe('March 2026');
    expect(monthYear('2025-06-19')).toBe('June 2025');
    expect(monthYear('2026-12-31')).toBe('December 2026');
  });

  it('is empty for a date it cannot read', () => {
    expect(monthYear('')).toBe('');
    expect(monthYear(null)).toBe('');
    expect(monthYear('2026-13-01')).toBe('');
  });
});

describe('formerProfessorTitle', () => {
  it('says when the professor was last listed', () => {
    expect(formerProfessorTitle('2026-08-19')).toBe('No longer listed at UNT (last seen August 2026)');
  });

  it('still says they are gone when the date is missing', () => {
    expect(formerProfessorTitle(undefined)).toBe('No longer listed at UNT');
  });
});

describe('visibleOfferings', () => {
  const offerings = [{ id: 1, faculty_former: 0 }, { id: 2, faculty_former: 1 }];

  it('returns the same array when former professors are included', () => {
    expect(visibleOfferings(offerings, true)).toBe(offerings);
  });

  it('drops the sections of former professors otherwise', () => {
    expect(visibleOfferings(offerings, false)).toEqual([{ id: 1, faculty_former: 0 }]);
  });
});
