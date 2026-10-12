import { format } from 'date-fns'
import { addDays, parseDateKey } from './dates'
import { minutesToTime, timeToMinutes } from './time'
import type { DateKey, Repeat, TimeOfDay } from './types'

export type TimeFormat = '12h' | '24h'

const pad = (n: number) => String(n).padStart(2, '0')

/** "06:30" -> "6:30 am" (12h) or "06:30" (24h), following the Settings choice. */
export function formatTime(time: TimeOfDay, timeFormat: TimeFormat = '12h'): string {
  const minutes = timeToMinutes(time)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (timeFormat === '24h') return `${pad(h)}:${pad(m)}`
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`
}

/** Same, starting from minutes after midnight. */
export function formatMinutesAsTime(minutes: number, timeFormat: TimeFormat = '12h'): string {
  return formatTime(minutesToTime(minutes), timeFormat)
}

/** 45 -> "45 min", 90 -> "90 min", 120 -> "2 h", 135 -> "2 h 15 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 120) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0]

/** "Daily", "Weekdays", "Sat, Sun", "Mon, Wed, Fri"... */
export function formatRepeat(repeat: Repeat): string {
  switch (repeat.kind) {
    case 'once':
      return 'Once'
    case 'daily':
      return 'Daily'
    case 'weekdays':
      return 'Weekdays'
    case 'custom': {
      const days = WEEK_FROM_MONDAY.filter((d) => repeat.days.includes(d))
      if (days.length === 7) return 'Daily'
      if (days.join() === '1,2,3,4,5') return 'Weekdays'
      return days.map((d) => DAY_NAMES[d]).join(', ')
    }
  }
}

/** Always the date itself, never "Today": "Tue, Oct 6" (with the year if it is another year). */
export function formatDay(date: DateKey, today: DateKey): string {
  const sameYear = date.slice(0, 4) === today.slice(0, 4)
  return format(parseDateKey(date), sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}

/** "Today", "Tomorrow", "Yesterday", or "Thu, Oct 8" (with the year if it is another year). */
export function formatDateLabel(date: DateKey, today: DateKey): string {
  if (date === today) return 'Today'
  if (date === addDays(today, 1)) return 'Tomorrow'
  if (date === addDays(today, -1)) return 'Yesterday'
  const sameYear = date.slice(0, 4) === today.slice(0, 4)
  return format(parseDateKey(date), sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}

/**
 * A time without am/pm, as the timeline blocks and the now-line label write it:
 * 6:30 (12h) or 06:30 (24h). Minutes after midnight in, so 1440 reads as 00:00 / 12:00.
 */
export function formatClock(minutes: number, timeFormat: TimeFormat = '12h'): string {
  const total = Math.floor(minutes) % (24 * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (timeFormat === '24h') return `${pad(h)}:${pad(m)}`
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)}`
}

/** "6:30 – 7:30" (12h) or "06:30 – 07:30" (24h): the time line on a block. */
export function formatRange(startMinutes: number, endMinutes: number, timeFormat: TimeFormat = '12h'): string {
  return `${formatClock(startMinutes, timeFormat)} – ${formatClock(endMinutes, timeFormat)}`
}

/**
 * A time span with am/pm written once when both ends share it: "6:30 – 7:30 am", "11:30 am – 12:30 pm",
 * or "06:30 – 07:30" in 24-hour time. Takes "HH:mm" times.
 */
export function formatSpan(start: TimeOfDay, end: TimeOfDay, timeFormat: TimeFormat = '12h'): string {
  const from = formatTime(start, timeFormat)
  const to = formatTime(end, timeFormat)
  if (timeFormat === '12h' && from.slice(-2) === to.slice(-2)) return `${from.slice(0, -3)} – ${to}`
  return `${from} – ${to}`
}

/** The label at the start of an hour line: "7 am", "12 pm" (12h) or "07:00" (24h). */
export function formatHourLabel(hour: number, timeFormat: TimeFormat = '12h'): string {
  if (timeFormat === '24h') return `${pad(hour % 24)}:00`
  const h = hour % 24
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`
}
