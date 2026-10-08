import { describe, expect, it } from 'vitest'
import { addDays, dayOfWeek, isDateKey, parseDateKey, toDateKey } from './dates'
import { isTimeOfDay, minutesToTime, timeToMinutes } from './time'

describe('date keys', () => {
  it('accepts real days and rejects everything else', () => {
    expect(isDateKey('2026-10-08')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true) // leap year
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '8/10/2026', '', null, 20261008]) {
      expect(isDateKey(bad)).toBe(false)
    }
  })

  it('uses the local day, not UTC', () => {
    // 11:59 pm local is still the same day, whatever the time zone is.
    expect(toDateKey(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08')
    expect(toDateKey(new Date(2026, 9, 8, 0, 1))).toBe('2026-10-08')
  })

  it('round-trips through a local Date', () => {
    expect(toDateKey(parseDateKey('2026-10-08'))).toBe('2026-10-08')
    expect(() => parseDateKey('nope')).toThrow()
  })

  it('adds days across months, years and clock changes', () => {
    expect(addDays('2026-10-08', 1)).toBe('2026-10-09')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-08', -7)).toBe('2026-10-01')
    // Days where clocks change (US spring and autumn) must still move by exactly one day.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })

  it('finds the day of the week (0 = Sunday)', () => {
    expect(dayOfWeek('2026-10-08')).toBe(4) // Thursday
    expect(dayOfWeek('2026-10-11')).toBe(0) // Sunday
    expect(dayOfWeek('2026-10-10')).toBe(6) // Saturday
  })
})

describe('times of day', () => {
  it('accepts 24-hour HH:mm only', () => {
    expect(isTimeOfDay('07:30')).toBe(true)
    expect(isTimeOfDay('23:59')).toBe(true)
    for (const bad of ['7:30', '24:00', '07:60', '07:30 am', '', null]) {
      expect(isTimeOfDay(bad)).toBe(false)
    }
  })

  it('converts to minutes and back', () => {
    expect(timeToMinutes('07:30')).toBe(450)
    expect(minutesToTime(450)).toBe('07:30')
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('stays inside one day', () => {
    expect(minutesToTime(-20)).toBe('00:00')
    expect(minutesToTime(24 * 60 + 30)).toBe('23:59')
  })
})
