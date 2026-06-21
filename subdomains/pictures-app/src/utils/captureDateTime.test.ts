import { describe, it, expect } from 'vitest'
import { formatCaptureDateTime } from './captureDateTime'

describe('formatCaptureDateTime', () => {
  it('formats a full date-time with 12-hour pm time', () => {
    expect(formatCaptureDateTime('2026-06-19T19:35:00')).toEqual({
      date: 'june 19, 2026',
      time: '7:35 pm',
    })
  })

  it('formats a morning time as am', () => {
    expect(formatCaptureDateTime('2026-01-05T08:07:00')).toEqual({
      date: 'january 5, 2026',
      time: '8:07 am',
    })
  })

  it('renders midnight as 12 am and noon as 12 pm', () => {
    expect(formatCaptureDateTime('2026-03-02T00:00:00')?.time).toBe('12:00 am')
    expect(formatCaptureDateTime('2026-03-02T12:00:00')?.time).toBe('12:00 pm')
  })

  it('accepts a space separator', () => {
    expect(formatCaptureDateTime('2026-06-19 19:35:00')?.time).toBe('7:35 pm')
  })

  it('returns date with null time for a date-only value', () => {
    expect(formatCaptureDateTime('2026-06-19')).toEqual({
      date: 'june 19, 2026',
      time: null,
    })
  })

  it('returns null for empty or malformed input', () => {
    expect(formatCaptureDateTime(null)).toBeNull()
    expect(formatCaptureDateTime(undefined)).toBeNull()
    expect(formatCaptureDateTime('not-a-date')).toBeNull()
  })
})
