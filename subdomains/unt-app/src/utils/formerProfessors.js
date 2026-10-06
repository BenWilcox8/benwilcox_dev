// Professors who are no longer listed on facultyinfo.unt.edu.
//
// The data pipeline keeps their sections from older scrapes and marks them in
// the Faculty table (`faculty_former`, `faculty_last_seen`). Every offering row
// carries `faculty_former` too, so the "Include Former Professors" toggle can
// drop their sections without a second query.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The offerings that are shown. The array is returned as is when nothing is
// dropped, so a caller that compares by identity sees no change.
export const visibleOfferings = (offerings, includeFormer) =>
  includeFormer ? offerings : offerings.filter((o) => !o.faculty_former);

// "2026-03-16" -> "March 2026". The date is split by hand: `new Date` would
// read it as UTC midnight, which is the evening before in Texas.
export const monthYear = (isoDate) => {
  const [year, month] = String(isoDate || '').split('-').map((part) => parseInt(part, 10));
  if (!year || !month || month < 1 || month > 12) return '';
  return `${MONTHS[month - 1]} ${year}`;
};

// The tooltip on the crossed-out name of a former professor.
export const formerProfessorTitle = (lastSeen) => {
  const seen = monthYear(lastSeen);
  return seen ? `No longer listed at UNT (last seen ${seen})` : 'No longer listed at UNT';
};
