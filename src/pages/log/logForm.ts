import {
  actualMinutes,
  elapsedSeconds,
  manualLogPatch,
  timeOfMoment,
  timeToMinutes,
  type LogPatch,
  type Occurrence,
  type TimeOfDay,
} from '../../data'

// The rules of the Log time form, kept apart from the screen so they can be tested.
// The form holds what is typed: Started, Ended and a Note.

export interface LogForm {
  /** "" until chosen. */
  start: TimeOfDay | ''
  end: TimeOfDay | ''
  note: string
}

/** What the form shows when the sheet opens (or after a timer was stopped): the saved log. */
export function initialLogForm(o: Occurrence): LogForm {
  return {
    start: o.actualStart ?? '',
    end: o.actualEnd ?? '',
    note: o.note,
  }
}

/** Why Started and Ended cannot be saved, or null if they are fine (or not both filled in). */
export function logTimeProblem(form: LogForm): string | null {
  if (form.start === '' || form.end === '') return null
  return timeToMinutes(form.end) <= timeToMinutes(form.start) ? 'Ended must be after Started.' : null
}

/**
 * Can "Save log" be pressed? With a timer running it saves the note (the timer carries on);
 * otherwise it needs a Started and an Ended that make sense. Shorter than planned is fine.
 */
export function canSaveLog(form: LogForm, timerRunning: boolean): boolean {
  if (timerRunning) return true
  return form.start !== '' && form.end !== '' && logTimeProblem(form) === null
}

/** Has anything been typed or chosen since the sheet opened? */
export function isLogDirty(form: LogForm, initial: LogForm): boolean {
  return form.start !== initial.start || form.end !== initial.end || form.note.trim() !== initial.note.trim()
}

/** What "Save log" writes. With a timer running, only the note changes. */
export function saveLogPatch(o: Occurrence, form: LogForm): Partial<LogPatch> {
  if (o.timerStartedAt !== null) return { note: form.note.trim() }
  return manualLogPatch(form.start as TimeOfDay, form.end as TimeOfDay, form.note.trim())
}

/**
 * The minutes the progress line counts: the time so far while the timer runs, otherwise the
 * typed Started to Ended. null when there is nothing to count yet.
 */
export function loggedMinutes(o: Occurrence, form: LogForm, nowMs: number): number | null {
  if (o.timerStartedAt !== null) return Math.floor(elapsedSeconds(o.timerStartedAt, nowMs) / 60)
  if (logTimeProblem(form) !== null) return null
  return actualMinutes({ actualStart: form.start === '' ? null : form.start, actualEnd: form.end === '' ? null : form.end })
}

/** The Started shown while the timer runs: when it began. */
export function timerStartText(o: Occurrence): TimeOfDay | null {
  return o.timerStartedAt === null ? null : timeOfMoment(o.timerStartedAt)
}

/** True when the block has a log to prefill or clear: done, skipped, a running timer or a note. */
export function hasLog(o: Occurrence): boolean {
  return (
    o.status !== 'planned' ||
    o.actualStart !== null ||
    o.actualEnd !== null ||
    o.timerStartedAt !== null ||
    o.note !== ''
  )
}

/** The Start timer card only makes sense on a block with no log at all. */
export function canStartTimer(o: Occurrence): boolean {
  return o.status === 'planned' && o.actualStart === null && o.actualEnd === null && o.timerStartedAt === null
}
