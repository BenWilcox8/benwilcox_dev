// Display formatting for a photo's capture date/time. Parses the local
// date(-time) string component-wise (no `new Date(...)`) so an evening capture
// never rolls a day from a UTC shift — mirroring the generator's local handling.

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

export type CaptureDisplay = {
  /** e.g. "june 19, 2026" */
  date: string
  /** e.g. "7:35 pm", or null when the value carries no time */
  time: string | null
}

/**
 * Format a capture value for the detail sidebar. Accepts a date-only string
 * (`2026-06-19`) or a date-time string (`2026-06-19T19:35:00` / with a space).
 * Returns the long date and, when present, the 12-hour time. Null on garbage.
 */
export function formatCaptureDateTime(value: string | null | undefined): CaptureDisplay | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null

  const [, year, month, day, hh, mm] = m
  const monthName = MONTHS[parseInt(month, 10) - 1]
  if (!monthName) return null

  const date = `${monthName} ${parseInt(day, 10)}, ${year}`

  let time: string | null = null
  if (hh !== undefined && mm !== undefined) {
    let hour = parseInt(hh, 10)
    const meridiem = hour >= 12 ? 'pm' : 'am'
    hour = hour % 12 || 12
    time = `${hour}:${mm} ${meridiem}`
  }

  return { date, time }
}
