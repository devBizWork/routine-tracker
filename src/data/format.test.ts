import { describe, expect, it } from 'vitest'
import { formatDateLabel, formatDuration, formatMinutesAsTime, formatRepeat, formatTime } from './format'

describe('formatTime', () => {
  it('writes 12-hour times like the designs', () => {
    expect(formatTime('06:30')).toBe('6:30 am')
    expect(formatTime('12:00')).toBe('12:00 pm')
    expect(formatTime('00:05')).toBe('12:05 am')
    expect(formatTime('21:00')).toBe('9:00 pm')
    expect(formatTime('23:59')).toBe('11:59 pm')
  })

  it('writes 24-hour times when asked', () => {
    expect(formatTime('06:30', '24h')).toBe('06:30')
    expect(formatTime('21:00', '24h')).toBe('21:00')
  })

  it('formats minutes after midnight', () => {
    expect(formatMinutesAsTime(450)).toBe('7:30 am')
  })
})

describe('formatDuration', () => {
  it('uses minutes up to 90 and hours from 2', () => {
    expect(formatDuration(5)).toBe('5 min')
    expect(formatDuration(60)).toBe('60 min')
    expect(formatDuration(90)).toBe('90 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(135)).toBe('2 h 15 min')
    expect(formatDuration(480)).toBe('8 h')
  })
})

describe('formatRepeat', () => {
  it('names the simple kinds', () => {
    expect(formatRepeat({ kind: 'once', days: [] })).toBe('Once')
    expect(formatRepeat({ kind: 'daily', days: [] })).toBe('Daily')
    expect(formatRepeat({ kind: 'weekdays', days: [] })).toBe('Weekdays')
  })

  it('lists custom days Monday first', () => {
    expect(formatRepeat({ kind: 'custom', days: [0, 6] })).toBe('Sat, Sun')
    expect(formatRepeat({ kind: 'custom', days: [5, 1, 3] })).toBe('Mon, Wed, Fri')
  })

  it('calls a full or Monday-to-Friday custom set by its simple name', () => {
    expect(formatRepeat({ kind: 'custom', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Daily')
    expect(formatRepeat({ kind: 'custom', days: [1, 2, 3, 4, 5] })).toBe('Weekdays')
  })
})

describe('formatDateLabel', () => {
  const today = '2026-10-08'
  it('says Today, Tomorrow and Yesterday', () => {
    expect(formatDateLabel('2026-10-08', today)).toBe('Today')
    expect(formatDateLabel('2026-10-09', today)).toBe('Tomorrow')
    expect(formatDateLabel('2026-10-07', today)).toBe('Yesterday')
  })

  it('writes other days as a short date, adding the year for other years', () => {
    expect(formatDateLabel('2026-10-15', today)).toBe('Thu, Oct 15')
    expect(formatDateLabel('2027-01-02', today)).toBe('Sat, Jan 2, 2027')
  })
})
