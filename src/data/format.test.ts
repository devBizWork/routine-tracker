import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDateLabel,
  formatDay,
  formatDuration,
  formatHourLabel,
  formatMinutesAsTime,
  formatRange,
  formatSpan,
  formatRepeat,
  formatTime,
} from './format'

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

describe('formatDay', () => {
  it('always writes the date, even for today', () => {
    expect(formatDay('2026-10-06', '2026-10-06')).toBe('Tue, Oct 6')
    expect(formatDay('2026-10-08', '2026-10-06')).toBe('Thu, Oct 8')
  })

  it('adds the year for another year', () => {
    expect(formatDay('2027-01-02', '2026-10-08')).toBe('Sat, Jan 2, 2027')
  })
})

describe('timeline time labels', () => {
  it('formatClock writes a time without am/pm', () => {
    expect(formatClock(390)).toBe('6:30')
    expect(formatClock(720)).toBe('12:00')
    expect(formatClock(0)).toBe('12:00')
    expect(formatClock(13 * 60 + 5)).toBe('1:05')
    expect(formatClock(390, '24h')).toBe('06:30')
    expect(formatClock(13 * 60 + 5, '24h')).toBe('13:05')
  })

  it('formatClock shows the minute that is in progress, like a clock (it rounds down)', () => {
    expect(formatClock(21 * 60 + 20.5)).toBe('9:20')
    expect(formatClock(21 * 60 + 20.99, '24h')).toBe('21:20')
  })

  it('formatRange writes the time line of a block', () => {
    expect(formatRange(390, 450)).toBe('6:30 – 7:30')
    expect(formatRange(11 * 60 + 15, 12 * 60)).toBe('11:15 – 12:00')
    expect(formatRange(390, 450, '24h')).toBe('06:30 – 07:30')
  })

  it('formatSpan writes am/pm once when both ends share it', () => {
    expect(formatSpan('06:30', '07:30')).toBe('6:30 – 7:30 am')
    expect(formatSpan('21:00', '21:40')).toBe('9:00 – 9:40 pm')
    expect(formatSpan('11:30', '12:30')).toBe('11:30 am – 12:30 pm')
    expect(formatSpan('06:30', '07:30', '24h')).toBe('06:30 – 07:30')
  })

  it('formatHourLabel writes the hour lines', () => {
    expect(formatHourLabel(7)).toBe('7 am')
    expect(formatHourLabel(12)).toBe('12 pm')
    expect(formatHourLabel(0)).toBe('12 am')
    expect(formatHourLabel(23)).toBe('11 pm')
    expect(formatHourLabel(7, '24h')).toBe('07:00')
    expect(formatHourLabel(23, '24h')).toBe('23:00')
  })
})
