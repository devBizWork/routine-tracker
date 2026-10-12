import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../../data'
import {
  canSaveLog,
  canStartTimer,
  hasLog,
  initialLogForm,
  isLogDirty,
  loggedMinutes,
  logTimeProblem,
  saveLogPatch,
  timerStartText,
} from './logForm'

const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 8, h, m, s).getTime()

function block(patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: 'o1',
    taskId: 't1',
    date: '2026-10-08',
    title: 'Deep work',
    color: 'focus',
    plannedStart: '09:00',
    plannedMinutes: 90,
    status: 'planned',
    actualStart: null,
    actualEnd: null,
    timerStartedAt: null,
    note: '',
    ...patch,
  }
}

describe('the form when the sheet opens', () => {
  it('is empty for a block with no log', () => {
    expect(initialLogForm(block())).toEqual({ start: '', end: '', note: '' })
  })

  it('is prefilled from a saved log', () => {
    const done = block({ status: 'done', actualStart: '09:15', actualEnd: '10:12', note: 'Phone rang' })
    expect(initialLogForm(done)).toEqual({ start: '09:15', end: '10:12', note: 'Phone rang' })
  })
})

describe('Started and Ended', () => {
  it('Ended must be after Started', () => {
    expect(logTimeProblem({ start: '10:00', end: '09:00', note: '' })).toBe('Ended must be after Started.')
    expect(logTimeProblem({ start: '10:00', end: '10:00', note: '' })).toBe('Ended must be after Started.')
    expect(logTimeProblem({ start: '10:00', end: '10:01', note: '' })).toBeNull()
  })

  it('no complaint until both are filled in', () => {
    expect(logTimeProblem({ start: '10:00', end: '', note: '' })).toBeNull()
    expect(logTimeProblem({ start: '', end: '', note: '' })).toBeNull()
  })

  it('shorter than planned is allowed (a partial log)', () => {
    const form = { start: '09:15', end: '10:12', note: '' } // 57 of 90
    expect(logTimeProblem(form)).toBeNull()
    expect(canSaveLog(form, false)).toBe(true)
  })

  it('Save needs both times, unless a timer is running (then it saves the note)', () => {
    expect(canSaveLog({ start: '', end: '', note: 'x' }, false)).toBe(false)
    expect(canSaveLog({ start: '09:00', end: '', note: '' }, false)).toBe(false)
    expect(canSaveLog({ start: '10:00', end: '09:00', note: '' }, false)).toBe(false)
    expect(canSaveLog({ start: '', end: '', note: '' }, true)).toBe(true)
  })
})

describe('what Save writes', () => {
  it('typed times become a done log with the trimmed note', () => {
    const form = { start: '09:15' as const, end: '10:12' as const, note: '  went well ' }
    expect(saveLogPatch(block(), form)).toEqual({
      status: 'done',
      actualStart: '09:15',
      actualEnd: '10:12',
      timerStartedAt: null,
      note: 'went well',
    })
  })

  it('with a timer running only the note is saved, so the timer carries on', () => {
    const form = { start: '' as const, end: '' as const, note: 'half way' }
    expect(saveLogPatch(block({ timerStartedAt: at(9, 15) }), form)).toEqual({ note: 'half way' })
  })
})

describe('unsaved changes', () => {
  const initial = { start: '09:15', end: '10:12', note: 'a' } as const
  it('nothing changed is not dirty', () => {
    expect(isLogDirty({ ...initial }, initial)).toBe(false)
    expect(isLogDirty({ ...initial, note: 'a  ' }, initial)).toBe(false)
  })
  it('a different time or note is dirty', () => {
    expect(isLogDirty({ ...initial, end: '10:30' }, initial)).toBe(true)
    expect(isLogDirty({ ...initial, start: '' }, initial)).toBe(true)
    expect(isLogDirty({ ...initial, note: 'b' }, initial)).toBe(true)
  })
})

describe('the progress line count', () => {
  it('counts the time so far while the timer runs, from the saved start', () => {
    const o = block({ timerStartedAt: at(9, 15) })
    expect(loggedMinutes(o, { start: '', end: '', note: '' }, at(10, 12, 12))).toBe(57)
  })

  it('counts typed times otherwise', () => {
    expect(loggedMinutes(block(), { start: '09:15', end: '10:12', note: '' }, at(12))).toBe(57)
  })

  it('has nothing to count with a missing or backwards time', () => {
    expect(loggedMinutes(block(), { start: '09:15', end: '', note: '' }, at(12))).toBeNull()
    expect(loggedMinutes(block(), { start: '10:00', end: '09:00', note: '' }, at(12))).toBeNull()
  })

  it('shows when a running timer began', () => {
    expect(timerStartText(block({ timerStartedAt: at(9, 15, 40) }))).toBe('09:15')
    expect(timerStartText(block())).toBeNull()
  })
})

describe('which blocks have a log, and which can be timed', () => {
  it('done, skipped, a timer, times or a note all count as a log', () => {
    expect(hasLog(block())).toBe(false)
    expect(hasLog(block({ status: 'done' }))).toBe(true)
    expect(hasLog(block({ status: 'skipped' }))).toBe(true)
    expect(hasLog(block({ timerStartedAt: 1 }))).toBe(true)
    expect(hasLog(block({ note: 'x' }))).toBe(true)
  })

  it('a timer can start only on a block with no times, no status and no timer', () => {
    expect(canStartTimer(block())).toBe(true)
    expect(canStartTimer(block({ note: 'x' }))).toBe(true)
    expect(canStartTimer(block({ status: 'done' }))).toBe(false)
    expect(canStartTimer(block({ timerStartedAt: 1 }))).toBe(false)
  })
})
