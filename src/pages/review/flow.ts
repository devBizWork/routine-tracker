import { format } from 'date-fns'
import {
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

export type PassedStatus = 'done' | 'skipped' | 'unknown' | 'now' | 'running'

export interface PassedBlock {
  occurrence: Occurrence
  status: PassedStatus
}

function momentOn(date: string, minutes: number): number {
  const day = parseDateKey(date)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes).getTime()
}

/**
 * The blocks of `date` that changed (started or ended) while the app was away, in time order, with
 * how each stands now: done, skipped, Unknown (over, nothing logged), Now (going on), or a timer
 * running.
 */
export function passedBlocks(occurrences: readonly Occurrence[], date: string, absence: Absence): PassedBlock[] {
  const inside = (moment: number) => moment > absence.from && moment <= absence.to
  return occurrences
    .filter((o) => {
      const start = momentOn(date, timeToMinutes(o.plannedStart))
      const end = momentOn(date, plannedEndMinutes(o))
      return o.plannedMinutes > 0 && (inside(start) || inside(end))
    })
    .sort((a, b) => timeToMinutes(a.plannedStart) - timeToMinutes(b.plannedStart))
    .map((o) => {
      const start = momentOn(date, timeToMinutes(o.plannedStart))
      const end = momentOn(date, plannedEndMinutes(o))
      let status: PassedStatus
      if (o.timerStartedAt !== null) status = 'running'
      else if (o.status === 'done') status = 'done'
      else if (o.status === 'skipped') status = 'skipped'
      else if (start <= absence.to && absence.to < end) status = 'now'
      else status = 'unknown'
      return { occurrence: o, status }
    })
}

/** "10:20 am – 12:10 pm", or "Mon 9:40 pm – 7:05 am" when the absence began on another day. */
export function absenceLabel(absence: Absence, timeFormat: TimeFormat): string {
  const from = timeOfMoment(absence.from)
  const to = timeOfMoment(absence.to)
  const sameDay = format(absence.from, 'yyyy-MM-dd') === format(absence.to, 'yyyy-MM-dd')
  if (sameDay) return formatSpan(from, to, timeFormat)
  return `${format(absence.from, 'EEE')} ${formatTime(from, timeFormat)} – ${formatTime(to, timeFormat)}`
}
