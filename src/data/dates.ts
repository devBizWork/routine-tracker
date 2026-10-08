import { addDays as addDaysToDate, format, getDay } from 'date-fns'
import type { DateKey } from './types'

// Dates are plain "YYYY-MM-DD" text in the phone's local time. Going through local
// Date objects (never UTC) means a day is always the day the person sees on the clock.

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd')
}

/** True for real calendar days such as "2026-10-08"; false for "2026-02-30" or "8/10". */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false
  const match = DATE_KEY.exec(value)
  if (!match) return false
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toDateKey(date) === value
}

/** Local midnight at the start of that day. */
export function parseDateKey(key: DateKey): Date {
  if (!isDateKey(key)) throw new Error(`Not a valid date: ${String(key)}`)
  const [year, month, day] = key.split('-').map(Number) as [number, number, number]
  return new Date(year, month - 1, day)
}

export function addDays(key: DateKey, days: number): DateKey {
  return toDateKey(addDaysToDate(parseDateKey(key), days))
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(key: DateKey): number {
  return getDay(parseDateKey(key))
}
