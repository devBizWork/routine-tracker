import {
  DEFAULT_CATEGORY,
  dayOfWeek,
  isDateKey,
  minutesToTime,
  timeToMinutes,
  type CategoryId,
  type DateKey,
  type NewTask,
  type RepeatKind,
  type TimeOfDay,
} from '../../data'

// The rules of the New block form, kept apart from the screen so they can be tested.
// A "draft" is what is on the form right now.

export const DURATION_STEP = 5
export const MIN_DURATION = 5
export const MAX_DURATION = 480
export const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120] as const
/** A block cannot run past 23:59 (midnight is not supported yet). */
const LAST_MINUTE_OF_DAY = 23 * 60 + 59

/** The durations the picker offers: 5, 10, 15 ... 480. */
export const DURATION_OPTIONS: readonly number[] = Array.from(
  { length: (MAX_DURATION - MIN_DURATION) / DURATION_STEP + 1 },
  (_, i) => MIN_DURATION + i * DURATION_STEP,
)

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [1, 2, 3, 4, 5]

export interface Draft {
  title: string
  /** "" until chosen. */
  start: TimeOfDay | ''
  duration: number
  /** Showing the End field instead of Duration. */
  endMode: boolean
  /** What was typed in End when it does not make a valid block (otherwise null). */
  endRaw: TimeOfDay | null
  kind: RepeatKind
  /** The day of a once block. "" if cleared. */
  date: DateKey | ''
  /** Days picked for Custom: 0 = Sunday ... 6 = Saturday. */
  customDays: number[]
  color: CategoryId
  notes: string
}

export function initialDraft(today: DateKey): Draft {
  return {
    title: '',
    start: '',
    duration: 30,
    endMode: false,
    endRaw: null,
    kind: 'once',
    date: today,
    customDays: [],
    color: DEFAULT_CATEGORY,
    notes: '',
  }
}

// ---- Time: start, duration and end stay in step ----

/** Minutes after midnight when the block ends, or null if no start is chosen. */
export function endMinutes(d: Draft): number | null {
  return d.start === '' ? null : timeToMinutes(d.start) + d.duration
}

/** The End shown on the form: what was typed if that is not valid yet, else start + duration. */
export function endValue(d: Draft): TimeOfDay | '' {
  if (d.endRaw !== null) return d.endRaw
  const end = endMinutes(d)
  return end === null ? '' : minutesToTime(end)
}

const snap = (minutes: number) =>
  Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(minutes / DURATION_STEP) * DURATION_STEP))

export function setStart(d: Draft, start: TimeOfDay | ''): Draft {
  // Moving the start moves the whole block: the duration stays, the end follows.
  return { ...d, start, endRaw: null }
}

export function setDuration(d: Draft, duration: number): Draft {
  return { ...d, duration: snap(duration), endRaw: null }
}

/**
 * Typing an End time sets the duration to match (rounded to the nearest 5 minutes, so the
 * Duration picker can always show it). An End that gives no valid block is kept as typed,
 * and reported by timeProblem, until it is fixed.
 */
export function setEnd(d: Draft, end: TimeOfDay | ''): Draft {
  if (end === '' || d.start === '') return d
  const length = timeToMinutes(end) - timeToMinutes(d.start)
  if (length < 1 || length > MAX_DURATION) return { ...d, endRaw: end }
  return { ...d, duration: snap(length), endRaw: null }
}

export function setEndMode(d: Draft, endMode: boolean): Draft {
  return { ...d, endMode, endRaw: null }
}

/** Why the time cannot be saved, or null if it is fine. */
export function timeProblem(d: Draft): string | null {
  if (d.endRaw !== null && d.start !== '') {
    const length = timeToMinutes(d.endRaw) - timeToMinutes(d.start)
    return length < 1 ? 'End must be after the start.' : 'A block can be at most 8 hours long.'
  }
  const end = endMinutes(d)
  if (end !== null && end > LAST_MINUTE_OF_DAY) return 'This block would run past midnight.'
  return null
}

// ---- Repeat ----

/** The days currently selected, for the row of day buttons. */
export function daysOf(d: Draft): number[] {
  if (d.kind === 'daily') return ALL_DAYS
  if (d.kind === 'weekdays') return WEEKDAYS
  if (d.kind === 'custom') return d.customDays
  return []
}

export function setKind(d: Draft, kind: RepeatKind, today: DateKey): Draft {
  if (kind === d.kind) return d
  // Custom starts from what was showing, so tapping it never begins from a blank slate.
  if (kind === 'custom') {
    const from =
      d.kind === 'once' ? [dayOfWeek(isDateKey(d.date) ? d.date : today)] : daysOf(d)
    return { ...d, kind, customDays: [...from] }
  }
  return { ...d, kind }
}

/** Tapping a day. On Daily or Weekdays this turns the repeat into Custom with that day flipped. */
export function toggleDay(d: Draft, day: number): Draft {
  const current = daysOf(d)
  const next = current.includes(day) ? current.filter((x) => x !== day) : [...current, day]
  return { ...d, kind: 'custom', customDays: next.sort((a, b) => a - b) }
}

/** Why the repeat cannot be saved, or null. */
export function repeatProblem(d: Draft): string | null {
  if (d.kind === 'custom' && d.customDays.length === 0) return 'Choose at least one day.'
  if (d.kind === 'once' && !isDateKey(d.date)) return 'Pick a date.'
  return null
}

// ---- Saving ----

export function canSave(d: Draft): boolean {
  return (
    d.title.trim() !== '' &&
    d.start !== '' &&
    timeProblem(d) === null &&
    repeatProblem(d) === null
  )
}

/** What to hand to createTask. Only call when canSave(draft) is true. */
export function toNewTask(d: Draft): NewTask {
  return {
    title: d.title.trim(),
    color: d.color,
    startTime: d.start === '' ? null : d.start,
    plannedMinutes: d.duration,
    repeat: { kind: d.kind, days: d.kind === 'custom' ? [...d.customDays].sort((a, b) => a - b) : [] },
    date: d.kind === 'once' && isDateKey(d.date) ? d.date : null,
    notes: d.notes,
  }
}

/** Has anything been typed or chosen? (Switching Duration/End on its own is not a change.) */
export function isDirty(d: Draft, initial: Draft): boolean {
  const content = (x: Draft) =>
    JSON.stringify([x.title.trim(), x.start, x.duration, x.endRaw, x.kind, x.date, x.customDays, x.color, x.notes.trim()])
  return content(d) !== content(initial)
}
