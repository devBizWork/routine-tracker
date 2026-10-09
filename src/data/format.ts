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
