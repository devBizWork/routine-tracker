import type { TimeOfDay } from './types'

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && TIME.test(value)
}

/** "07:30" -> 450 (minutes after midnight). */
export function timeToMinutes(time: TimeOfDay): number {
  const match = TIME.exec(time)
  if (!match) throw new Error(`Not a valid time: ${String(time)}`)
  return Number(match[1]) * 60 + Number(match[2])
}

/** 450 -> "07:30". Stays inside one day: below 0 gives 00:00, past the end gives 23:59. */
export function minutesToTime(minutes: number): TimeOfDay {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), 24 * 60 - 1)
  const h = String(Math.floor(clamped / 60)).padStart(2, '0')
  const m = String(clamped % 60).padStart(2, '0')
  return `${h}:${m}`
}
