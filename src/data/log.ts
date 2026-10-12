import { parseDateKey, toDateKey } from './dates'
import { formatDuration } from './format'
import { minutesToTime, timeToMinutes } from './time'
import type { DateKey, Occurrence, TimeOfDay, Tolerances } from './types'

// The rules for logging what actually happened, kept apart from the database and the screens
// so they can be tested. Times are "HH:mm" inside one day; a moment in time is milliseconds.

const DAY_MINUTES = 24 * 60
/** The last minute a log can use (a log stays inside one day, like the plan). */
const LAST_MINUTE = DAY_MINUTES - 1

/** The part of an occurrence that logging changes. */
export interface LogPatch {
  status: Occurrence['status']
  actualStart: TimeOfDay | null
  actualEnd: TimeOfDay | null
  timerStartedAt: number | null
  note: string
}

// ---- Clock helpers ----

/** The wall-clock time of a moment: 1760000000000 -> "09:15". */
export function timeOfMoment(ms: number): TimeOfDay {
  const d = new Date(ms)
  return minutesToTime(d.getHours() * 60 + d.getMinutes())
}

/** The local date of a moment. */
export function dateOfMoment(ms: number): DateKey {
  return toDateKey(new Date(ms))
}

/** Minutes after midnight when the block is planned to end. */
export function plannedEndMinutes(o: Pick<Occurrence, 'plannedStart' | 'plannedMinutes'>): number {
  return Math.min(DAY_MINUTES, timeToMinutes(o.plannedStart) + o.plannedMinutes)
}

/** The moment (ms) the block is planned to end, on its own date. */
export function plannedEndMoment(o: Pick<Occurrence, 'date' | 'plannedStart' | 'plannedMinutes'>): number {
  const day = parseDateKey(o.date)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, plannedEndMinutes(o)).getTime()
}

// ---- The timer ----

/** Whole seconds a timer has run. Always worked out from the saved start, never counted. */
export function elapsedSeconds(startedAt: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startedAt) / 1000))
}

/** 3432 -> "57:12"; 3725 -> "1:02:05". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** "15 min after plan", "10 min before plan" or "on plan": how the start compares with the plan. */
export function startRelation(plannedStart: TimeOfDay, actualStart: TimeOfDay): string {
  const diff = timeToMinutes(actualStart) - timeToMinutes(plannedStart)
  if (diff === 0) return 'on plan'
  return `${formatDuration(Math.abs(diff))} ${diff > 0 ? 'after' : 'before'} plan`
}

/**
 * What stopping a running timer saves: Started is when the timer began and Ended is `endMs`
 * (or, with atPlannedEnd, the block's planned end). The log keeps to one day and always has
 * an end after the start, even for a timer stopped within a minute.
 */
export function stopPatch(o: Occurrence, endMs: number, atPlannedEnd = false): LogPatch {
  if (o.timerStartedAt === null) throw new Error('No timer is running on this block.')
  let start = timeToMinutes(timeOfMoment(o.timerStartedAt))
  let end: number
  if (atPlannedEnd) {
    const planned = Math.min(plannedEndMinutes(o), LAST_MINUTE)
    // A timer started after the planned end can only keep the planned length.
    end = planned > start ? planned : start + o.plannedMinutes
  } else {
    end = dateOfMoment(endMs) > o.date ? LAST_MINUTE : timeToMinutes(timeOfMoment(endMs))
  }
  end = Math.max(end, start + 1)
  if (end > LAST_MINUTE) {
    end = LAST_MINUTE
    start = Math.min(start, LAST_MINUTE - 1)
  }
  return {
    status: 'done',
    actualStart: minutesToTime(start),
    actualEnd: minutesToTime(end),
    timerStartedAt: null,
    note: o.note,
  }
}

// ---- The quick actions ----

/** "Done as planned": the planned start and end are copied in. */
export function doneAsPlannedPatch(o: Occurrence, note: string): LogPatch {
  return {
    status: 'done',
    actualStart: o.plannedStart,
    actualEnd: minutesToTime(Math.min(plannedEndMinutes(o), LAST_MINUTE)),
    timerStartedAt: null,
    note,
  }
}

export function skippedPatch(note: string): LogPatch {
  return { status: 'skipped', actualStart: null, actualEnd: null, timerStartedAt: null, note }
}

/** Takes the log off, so the block is Unknown again once it is over. */
export function clearLogPatch(): LogPatch {
  return { status: 'planned', actualStart: null, actualEnd: null, timerStartedAt: null, note: '' }
}

/** A log from times typed by hand. */
export function manualLogPatch(start: TimeOfDay, end: TimeOfDay, note: string): LogPatch {
  return { status: 'done', actualStart: start, actualEnd: end, timerStartedAt: null, note }
}

// ---- How the log compares with the plan ----

/** Minutes actually logged, or null if there are no (valid) actual times. */
export function actualMinutes(o: Pick<Occurrence, 'actualStart' | 'actualEnd'>): number | null {
  if (o.actualStart === null || o.actualEnd === null) return null
  const minutes = timeToMinutes(o.actualEnd) - timeToMinutes(o.actualStart)
  return minutes > 0 ? minutes : null
}

export type Deviation =
  | { kind: 'none' }
  | { kind: 'late' | 'early' | 'over' | 'short'; minutes: number }

/**
 * Is a done block off plan? It is when it started further from its planned start than the
 * on-time tolerance (10 min), or, if the start was fine, when its length differs by more than
 * the length tolerance (10%). A late or early start is reported before the length.
 */
export function deviation(
  o: Pick<Occurrence, 'plannedStart' | 'plannedMinutes' | 'actualStart' | 'actualEnd'>,
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>,
): Deviation {
  const length = actualMinutes(o)
  if (o.actualStart === null || length === null) return { kind: 'none' }
  const startDiff = timeToMinutes(o.actualStart) - timeToMinutes(o.plannedStart)
  if (Math.abs(startDiff) > tolerances.onTimeMin) {
    return { kind: startDiff > 0 ? 'late' : 'early', minutes: Math.abs(startDiff) }
  }
  const lengthDiff = length - o.plannedMinutes
  if (Math.abs(lengthDiff) > (o.plannedMinutes * tolerances.lengthPct) / 100) {
    return { kind: lengthDiff > 0 ? 'over' : 'short', minutes: Math.abs(lengthDiff) }
  }
  return { kind: 'none' }
}

/** The tag on a block that is off plan: "+15 min", "−33 min", "Started 60 min late". */
export function deviationTag(d: Deviation): string | null {
  switch (d.kind) {
    case 'none':
      return null
    case 'late':
      return `Started ${formatDuration(d.minutes)} late`
    case 'early':
      return `Started ${formatDuration(d.minutes)} early`
    case 'over':
      return `+${formatDuration(d.minutes)}`
    case 'short':
      return `−${formatDuration(d.minutes)}`
  }
}

/** "57 of 90 min" and how it compares: partial (less), over plan (more) or as planned. */
export function progressLine(
  plannedMinutes: number,
  actual: number,
): { text: string; label: 'partial' | 'over plan' | 'as planned'; fraction: number } {
  return {
    text: `${actual} of ${plannedMinutes} min`,
    label: actual < plannedMinutes ? 'partial' : actual > plannedMinutes ? 'over plan' : 'as planned',
    fraction: Math.min(1, Math.max(0, actual / plannedMinutes)),
  }
}

// ---- A timer that was forgotten ----

/** A timer still running this long after the block's planned end gets the "Still doing...?" question. */
export const STILL_DOING_AFTER_MS = 2 * 60 * 60 * 1000

/**
 * True when a running timer is 2 hours past the block's planned end (or 2 hours past its own
 * start, if it was started after the planned end, so a late start is not asked about at once).
 */
export function needsStillDoing(o: Occurrence, nowMs: number): boolean {
  if (o.timerStartedAt === null) return false
  return nowMs >= Math.max(plannedEndMoment(o), o.timerStartedAt) + STILL_DOING_AFTER_MS
}
