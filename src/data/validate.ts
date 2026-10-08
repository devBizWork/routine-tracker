import { isCategoryId } from './categories'
import { isDateKey } from './dates'
import { isTimeOfDay } from './time'
import type { DateKey, Occurrence, Settings, Task } from './types'

/** Thrown when something we were asked to save does not make sense. */
export class DataError extends Error {}

export const MAX_PLANNED_MINUTES = 24 * 60

function fail(message: string): never {
  throw new DataError(message)
}

/**
 * Checks a whole task and returns a tidy copy (trimmed title, sorted days, and so on).
 * A one-off task that has a start time but no date gets today's date.
 */
export function normalizeTask(task: Task, today: DateKey): Task {
  const title = typeof task.title === 'string' ? task.title.trim() : ''
  if (title === '') fail('A task needs a title.')
  if (!isCategoryId(task.color)) fail(`Unknown category: ${String(task.color)}`)
  if (task.startTime !== null && !isTimeOfDay(task.startTime)) {
    fail(`Start time must look like 07:30, not ${String(task.startTime)}.`)
  }
  if (
    !Number.isInteger(task.plannedMinutes) ||
    task.plannedMinutes < 1 ||
    task.plannedMinutes > MAX_PLANNED_MINUTES
  ) {
    fail(`Planned minutes must be a whole number from 1 to ${MAX_PLANNED_MINUTES}.`)
  }

  const kind = task.repeat?.kind
  if (kind !== 'once' && kind !== 'daily' && kind !== 'weekdays' && kind !== 'custom') {
    fail(`Unknown repeat: ${String(kind)}`)
  }
  let days: number[] = []
  if (kind === 'custom') {
    if (!task.repeat.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      fail('Repeat days must be numbers from 0 (Sunday) to 6 (Saturday).')
    }
    days = [...new Set(task.repeat.days)].sort((a, b) => a - b)
    if (days.length === 0) fail('Choose at least one day to repeat on.')
  }

  for (const [name, value] of [
    ['date', task.date],
    ['activeFrom', task.activeFrom],
    ['activeTo', task.activeTo],
  ] as const) {
    if (value !== null && !isDateKey(value)) fail(`${name} must look like 2026-10-08.`)
  }
  if (task.activeFrom !== null && task.activeTo !== null && task.activeFrom > task.activeTo) {
    fail('activeFrom cannot be after activeTo.')
  }

  if (task.soundOverride !== null && typeof task.soundOverride !== 'string') {
    fail('soundOverride must be null, "silent" or a chime id.')
  }

  let date = kind === 'once' ? task.date : null
  if (kind === 'once' && task.startTime !== null && date === null) date = today

  return {
    ...task,
    title,
    repeat: { kind, days },
    date,
    notes: typeof task.notes === 'string' ? task.notes : '',
  }
}

/** Checks a whole Settings record before it is saved. */
export function assertValidSettings(s: Settings): void {
  for (const key of ['soundsOn', 'warn5min', 'endSound', 'keepScreenOn', 'installPromptDismissed'] as const) {
    if (typeof s[key] !== 'boolean') fail(`${key} must be on or off.`)
  }
  if (typeof s.chimeId !== 'string' || s.chimeId === '') fail('chimeId must be a chime name.')
  if (typeof s.quietHours.on !== 'boolean') fail('quietHours.on must be on or off.')
  for (const time of [s.quietHours.from, s.quietHours.to, s.dayStart, s.dayEnd]) {
    if (!isTimeOfDay(time)) fail(`Times must look like 07:30, not ${String(time)}.`)
  }
  if (s.dayStart >= s.dayEnd) fail('The day must start before it ends.')
  if (s.timeFormat !== '12h' && s.timeFormat !== '24h') fail('timeFormat must be 12h or 24h.')

  const { onTimeMin, lengthPct, zeroCreditMin } = s.tolerances
  if (!Number.isFinite(onTimeMin) || onTimeMin < 0) fail('onTimeMin must be 0 or more.')
  if (!Number.isFinite(lengthPct) || lengthPct < 0 || lengthPct > 100) {
    fail('lengthPct must be from 0 to 100.')
  }
  // Timing credit falls evenly from onTimeMin to zeroCreditMin, so it must be larger.
  if (!Number.isFinite(zeroCreditMin) || zeroCreditMin <= onTimeMin) {
    fail('zeroCreditMin must be larger than onTimeMin.')
  }
  if (s.lastBackupAt !== null && !Number.isFinite(s.lastBackupAt)) {
    fail('lastBackupAt must be a moment in time or null.')
  }
  if (!Number.isInteger(s.backupReminderDays) || s.backupReminderDays < 1) {
    fail('backupReminderDays must be a whole number of 1 or more.')
  }
}

/** Checks the parts of an occurrence that a screen is allowed to change. */
export function assertValidOccurrence(occ: Occurrence): void {
  if (occ.status !== 'planned' && occ.status !== 'done' && occ.status !== 'skipped') {
    fail(`Unknown status: ${String(occ.status)}`)
  }
  if (typeof occ.title !== 'string' || occ.title.trim() === '') fail('An occurrence needs a title.')
  if (!isCategoryId(occ.color)) fail(`Unknown category: ${String(occ.color)}`)
  if (!isTimeOfDay(occ.plannedStart)) fail('plannedStart must look like 07:30.')
  if (
    !Number.isInteger(occ.plannedMinutes) ||
    occ.plannedMinutes < 1 ||
    occ.plannedMinutes > MAX_PLANNED_MINUTES
  ) {
    fail('plannedMinutes must be a whole number from 1 to 1440.')
  }
  for (const value of [occ.actualStart, occ.actualEnd]) {
    if (value !== null && !isTimeOfDay(value)) fail('Actual times must look like 07:30.')
  }
  if (occ.timerStartedAt !== null && !Number.isFinite(occ.timerStartedAt)) {
    fail('timerStartedAt must be a moment in time or null.')
  }
  if (typeof occ.note !== 'string') fail('note must be text.')
}
