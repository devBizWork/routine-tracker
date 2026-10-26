import { format } from 'date-fns'
import {
  addDays,
  doneAsPlannedPatch,
  formatSpan,
  formatTime,
  manualLogPatch,
  minutesToTime,
  parseDateKey,
  plannedEndMinutes,
  skippedPatch,
  timeOfMoment,
  timeToMinutes,
  type LogPatch,
  type Occurrence,
  type TimeFormat,
  type TimeOfDay,
} from '../../data'

// The rules behind "Review today" (design/screens/ReviewFlow.html) and the "While you were away"
// card (WelcomeBack.html), kept apart from the screens so they can be tested.

// ---- Which blocks to review ----

/** A block with nothing logged on it: no done, no skipped, no times and no running timer. */
export function needsLog(o: Occurrence): boolean {
  return o.status === 'planned' && o.actualStart === null && o.actualEnd === null && o.timerStartedAt === null
}

/**
 * The blocks "Review today" steps through, in time order: the ones with nothing logged whose
 * planned end has passed. All of them on a past day, none on a future day, and on today only
 * those already over (a block still running is not "left to log" yet).
 */
export function blocksToReview(
  occurrences: readonly Occurrence[],
  date: string,
  today: string,
  nowMinutes: number,
): Occurrence[] {
  if (date > today) return []
  return occurrences
    .filter((o) => needsLog(o) && o.plannedMinutes > 0 && (date < today || plannedEndMinutes(o) <= nowMinutes))
    .sort((a, b) => timeToMinutes(a.plannedStart) - timeToMinutes(b.plannedStart) || a.title.localeCompare(b.title))
}

// ---- Answers ----

export type Answer =
  | { kind: 'planned' }
  | { kind: 'other'; start: TimeOfDay; end: TimeOfDay }
  | { kind: 'skipped' }
  | { kind: 'unsure' }

/** What an answer saves on the block, or null for "Not sure" (it stays Unknown). */
export function answerPatch(o: Occurrence, answer: Answer): LogPatch | null {
  switch (answer.kind) {
    case 'planned':
      return doneAsPlannedPatch(o, o.note)
    case 'other':
      return manualLogPatch(answer.start, answer.end, o.note)
    case 'skipped':
      return skippedPatch(o.note)
    case 'unsure':
      return null
  }
}

/** The status line after an answer: "done as planned", "done 9:15 – 9:50 am", "skipped". */
export function answerLabel(answer: Answer, timeFormat: TimeFormat): string {
  switch (answer.kind) {
    case 'planned':
      return 'done as planned'
    case 'other':
      return `done ${formatSpan(answer.start, answer.end, timeFormat)}`
    case 'skipped':
      return 'skipped'
    case 'unsure':
      return 'left as Unknown'
  }
}

/** The block's log as it is now, so Undo can put it back exactly. */
export function logSnapshot(o: Occurrence): LogPatch {
  return {
    status: o.status,
    actualStart: o.actualStart,
    actualEnd: o.actualEnd,
    timerStartedAt: o.timerStartedAt,
    note: o.note,
  }
}

/** Why "Done, at other times" cannot be saved yet, or null. */
export function otherTimesProblem(start: TimeOfDay | '', end: TimeOfDay | ''): string | null {
  if (start === '' || end === '') return 'Choose when it started and ended.'
  return timeToMinutes(end) <= timeToMinutes(start) ? 'Ended must be after Started.' : null
}

/** The planned span as the review card writes it: "10:30 – 11:00 am". */
export function plannedSpan(o: Occurrence, timeFormat: TimeFormat): string {
  return formatSpan(o.plannedStart, minutesToTime(plannedEndMinutes(o)), timeFormat)
}

// ---- While you were away ----

/** A stretch of time the app was closed or in the background (milliseconds). */
export interface Absence {
  from: number
  to: number
}

/** Missed blocks older than this many days (today included) drop off the card. */
export const AWAY_KEEP_DAYS = 7
/** The card lists at most this many blocks (the most recent); the rest are counted as "+ N more". */
export const AWAY_SHOW_MAX = 10

function momentOn(date: string, minutes: number): number {
  const day = parseDateKey(date)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes).getTime()
}

/** The oldest day the card still covers. */
export function oldestAwayDay(today: string): string {
  return addDays(today, -(AWAY_KEEP_DAYS - 1))
}

/** Adds an absence to the list, joining it with any it overlaps or touches. Sorted by start. */
export function mergeAbsence(list: readonly Absence[], next: Absence): Absence[] {
  const all = [...list, next].sort((a, b) => a.from - b.from)
  const merged: Absence[] = []
  for (const a of all) {
    const last = merged[merged.length - 1]
    if (last && a.from <= last.to) last.to = Math.max(last.to, a.to)
    else merged.push({ ...a })
  }
  return merged
}

/** Drops absences that ended before the oldest day the card still covers. */
export function keepRecentAbsences(list: readonly Absence[], nowMs: number): Absence[] {
  const oldest = parseDateKey(oldestAwayDay(format(nowMs, 'yyyy-MM-dd'))).getTime()
  return list.filter((a) => a.to >= oldest)
}

/**
 * The blocks the card is about, in time order: they started or ended while the app was away, are
 * over, still have nothing logged, and are from the last week. Logging one anywhere takes it off.
 */
export function missedBlocks(
  occurrences: readonly Occurrence[],
  absences: readonly Absence[],
  today: string,
  nowMs: number,
): Occurrence[] {
  const oldest = oldestAwayDay(today)
  return occurrences
    .filter((o) => {
      if (o.date < oldest || o.date > today || o.plannedMinutes <= 0 || !needsLog(o)) return false
      const start = momentOn(o.date, timeToMinutes(o.plannedStart))
      const end = momentOn(o.date, plannedEndMinutes(o))
      if (end > nowMs) return false
      return absences.some((a) => (start > a.from && start <= a.to) || (end > a.from && end <= a.to))
    })
    .sort((a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.plannedStart) - timeToMinutes(b.plannedStart))
}

/** What the card lists: the most recent AWAY_SHOW_MAX blocks (still in time order) and how many more. */
export function cardList(missed: readonly Occurrence[]): { shown: Occurrence[]; more: number } {
  const shown = missed.slice(-AWAY_SHOW_MAX)
  return { shown, more: missed.length - shown.length }
}

/** "10:20 am – 12:10 pm", or "Mon 9:40 pm – 7:05 am" when the absences began on another day. */
export function absenceLabel(absences: readonly Absence[], timeFormat: TimeFormat): string {
  const fromMs = Math.min(...absences.map((a) => a.from))
  const toMs = Math.max(...absences.map((a) => a.to))
  const from = timeOfMoment(fromMs)
  const to = timeOfMoment(toMs)
  const sameDay = format(fromMs, 'yyyy-MM-dd') === format(toMs, 'yyyy-MM-dd')
  if (sameDay) return formatSpan(from, to, timeFormat)
  return `${format(fromMs, 'EEE')} ${formatTime(from, timeFormat)} – ${formatTime(to, timeFormat)}`
}
