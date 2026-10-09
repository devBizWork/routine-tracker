import { describe, expect, it } from 'vitest'
import type { Task } from '../../data'
import {
  DURATION_OPTIONS,
  QUICK_DURATIONS,
  canSave,
  changesMoreThanOneDay,
  copyDraft,
  dayOnlyPatch,
  daysOf,
  draftFromTask,
  durationChoices,
  endValue,
  initialDraft,
  isDirty,
  repeatProblem,
  scopeDescriptions,
  setDuration,
  setEnd,
  setEndMode,
  setKind,
  setStart,
  timeProblem,
  toNewTask,
  toggleDay,
  type Draft,
} from './draft'

const TODAY = '2026-10-08' // a Thursday
const fresh = () => initialDraft(TODAY)
const ready = (extra: Partial<Draft> = {}): Draft => ({ ...fresh(), title: 'Workout', start: '06:30', ...extra })

describe('a new draft', () => {
  it('starts empty, as a one-off today, 30 minutes, category Focus', () => {
    expect(fresh()).toMatchObject({
      title: '',
      start: '',
      duration: 30,
      kind: 'once',
      date: TODAY,
      color: 'focus',
      notes: '',
      endMode: false,
    })
  })

  it('offers durations in 5-minute steps from 5 to 480', () => {
    expect(DURATION_OPTIONS[0]).toBe(5)
    expect(DURATION_OPTIONS[1]).toBe(10)
    expect(DURATION_OPTIONS.at(-1)).toBe(480)
    expect(DURATION_OPTIONS).toHaveLength(96)
    expect(DURATION_OPTIONS.every((n) => n % 5 === 0)).toBe(true)
  })

  it('has the quick chips from the design', () => {
    expect(QUICK_DURATIONS).toEqual([15, 30, 45, 60, 90, 120])
  })
})

describe('Save is only allowed with a title and a start time', () => {
  it('is disabled while either is missing', () => {
    expect(canSave(fresh())).toBe(false)
    expect(canSave({ ...fresh(), title: 'Workout' })).toBe(false)
    expect(canSave({ ...fresh(), start: '06:30' })).toBe(false)
    expect(canSave({ ...fresh(), title: '   ', start: '06:30' })).toBe(false)
  })

  it('is enabled with both', () => {
    expect(canSave(ready())).toBe(true)
  })
})

describe('start, duration and end stay in sync', () => {
  it('shows the end as start + duration', () => {
    expect(endValue(ready())).toBe('07:00')
    expect(endValue(setDuration(ready(), 60))).toBe('07:30')
    expect(endValue(fresh())).toBe('')
  })

  it('typing an end sets the duration', () => {
    const d = setEnd(ready(), '07:45')
    expect(d.duration).toBe(75)
    expect(endValue(d)).toBe('07:45')
  })

  it('rounds an end to the nearest 5 minutes so the Duration picker can show it', () => {
    const d = setEnd(ready(), '07:47')
    expect(d.duration).toBe(75)
    expect(endValue(d)).toBe('07:45')
    expect(setEnd(ready(), '06:31').duration).toBe(5)
  })

  it('moving the start keeps the duration and moves the end', () => {
    const d = setStart(setDuration(ready(), 60), '09:00')
    expect(d.duration).toBe(60)
    expect(endValue(d)).toBe('10:00')
  })

  it('picking a duration (or a chip) is reflected in the end', () => {
    expect(endValue(setDuration(ready(), 90))).toBe('08:00')
  })

  it('keeps durations inside 5 to 480', () => {
    expect(setDuration(ready(), 2).duration).toBe(5)
    expect(setDuration(ready(), 999).duration).toBe(480)
  })

  it('switching between Duration and End loses nothing', () => {
    const d = setEndMode(setEndMode(setDuration(ready(), 45), true), false)
    expect(d.duration).toBe(45)
    expect(d.start).toBe('06:30')
  })

  it('an end before the start is kept as typed and blocks Save with a reason', () => {
    const d = setEnd(ready(), '06:00')
    expect(d.endRaw).toBe('06:00')
    expect(d.duration).toBe(30) // unchanged
    expect(endValue(d)).toBe('06:00')
    expect(timeProblem(d)).toBe('End must be after the start.')
    expect(canSave(d)).toBe(false)
  })

  it('an end that makes a block longer than 8 hours is refused too', () => {
    const d = setEnd(ready(), '15:00')
    expect(timeProblem(d)).toBe('A block can be at most 8 hours long.')
    expect(canSave(d)).toBe(false)
  })

  it('fixing the end clears the problem', () => {
    const d = setEnd(setEnd(ready(), '06:00'), '07:00')
    expect(d.endRaw).toBeNull()
    expect(d.duration).toBe(30)
    expect(timeProblem(d)).toBeNull()
  })

  it('an end with no start yet is ignored', () => {
    expect(setEnd(fresh(), '07:00')).toEqual(fresh())
  })

  it('refuses a block that would run past midnight', () => {
    const d = setDuration(setStart(ready(), '23:30'), 60)
    expect(timeProblem(d)).toBe('This block would run past midnight.')
    expect(canSave(d)).toBe(false)
    expect(timeProblem(setDuration(setStart(ready(), '23:00'), 55))).toBeNull()
  })
})

describe('repeat', () => {
  it('shows the days that Daily and Weekdays stand for', () => {
    expect(daysOf(ready({ kind: 'daily' }))).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(daysOf(ready({ kind: 'weekdays' }))).toEqual([1, 2, 3, 4, 5])
    expect(daysOf(ready({ kind: 'once' }))).toEqual([])
  })

  it('Custom starts from what was showing', () => {
    expect(daysOf(setKind(ready({ kind: 'weekdays' }), 'custom', TODAY))).toEqual([1, 2, 3, 4, 5])
    expect(daysOf(setKind(ready({ kind: 'daily' }), 'custom', TODAY))).toEqual([0, 1, 2, 3, 4, 5, 6])
    // From Once it starts with the weekday of the chosen date (8 Oct 2026 is a Thursday).
    expect(daysOf(setKind(ready({ kind: 'once' }), 'custom', TODAY))).toEqual([4])
    expect(daysOf(setKind(ready({ kind: 'once', date: '2026-10-10' }), 'custom', TODAY))).toEqual([6])
  })

  it('toggling a day in Custom adds and removes it', () => {
    let d = setKind(ready({ kind: 'once' }), 'custom', TODAY)
    d = toggleDay(d, 1)
    expect(d.customDays).toEqual([1, 4])
    d = toggleDay(d, 4)
    expect(d.customDays).toEqual([1])
  })

  it('tapping a day on Daily or Weekdays turns it into Custom', () => {
    const d = toggleDay(ready({ kind: 'weekdays' }), 1) // Monday off
    expect(d.kind).toBe('custom')
    expect(d.customDays).toEqual([2, 3, 4, 5])
    const e = toggleDay(ready({ kind: 'daily' }), 0) // Sunday off
    expect(e.kind).toBe('custom')
    expect(e.customDays).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('Custom needs at least one day', () => {
    let d = setKind(ready({ kind: 'once' }), 'custom', TODAY)
    d = toggleDay(d, 4)
    expect(d.customDays).toEqual([])
    expect(repeatProblem(d)).toBe('Choose at least one day.')
    expect(canSave(d)).toBe(false)
    expect(canSave(toggleDay(d, 2))).toBe(true)
  })

  it('Once needs a date', () => {
    expect(repeatProblem(ready({ kind: 'once', date: '' }))).toBe('Pick a date.')
    expect(canSave(ready({ kind: 'once', date: '' }))).toBe(false)
  })

  it('remembers the custom days when switching away and back', () => {
    let d = setKind(ready({ kind: 'once' }), 'custom', TODAY)
    d = toggleDay(d, 1)
    d = setKind(d, 'daily', TODAY)
    expect(d.customDays).toEqual([1, 4])
  })
})

describe('what gets saved', () => {
  it('turns a one-off draft into a task with its date', () => {
    const input = toNewTask(ready({ title: '  Dentist  ', duration: 45, color: 'personal', notes: 'Bring forms' }))
    expect(input).toEqual({
      title: 'Dentist',
      color: 'personal',
      startTime: '06:30',
      plannedMinutes: 45,
      repeat: { kind: 'once', days: [] },
      date: TODAY,
      notes: 'Bring forms',
    })
  })

  it('a repeating draft has no date, and custom keeps its days in order', () => {
    expect(toNewTask(ready({ kind: 'daily' }))).toMatchObject({ repeat: { kind: 'daily', days: [] }, date: null })
    const custom = toNewTask(ready({ kind: 'custom', customDays: [5, 1, 3] }))
    expect(custom.repeat).toEqual({ kind: 'custom', days: [1, 3, 5] })
    expect(custom.date).toBeNull()
  })
})

describe('has anything changed?', () => {
  const start = fresh()

  it('a new form is not dirty', () => {
    expect(isDirty(fresh(), start)).toBe(false)
  })

  it('typing, choosing or ticking something makes it dirty', () => {
    expect(isDirty({ ...fresh(), title: 'x' }, start)).toBe(true)
    expect(isDirty(setStart(fresh(), '07:00'), start)).toBe(true)
    expect(isDirty(setDuration(fresh(), 60), start)).toBe(true)
    expect(isDirty({ ...fresh(), color: 'admin' }, start)).toBe(true)
    expect(isDirty({ ...fresh(), notes: 'n' }, start)).toBe(true)
    expect(isDirty(setKind(fresh(), 'daily', TODAY), start)).toBe(true)
  })

  it('spaces alone and switching Duration/End do not count', () => {
    expect(isDirty({ ...fresh(), title: '   ' }, start)).toBe(false)
    expect(isDirty(setEndMode(fresh(), true), start)).toBe(false)
  })

  it('putting everything back is not dirty', () => {
    expect(isDirty(setStart(setStart(fresh(), '07:00'), ''), start)).toBe(false)
  })
})

// ---- Edit, Duplicate, Schedule ----


function savedTask(extra: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Morning workout',
    color: 'movement',
    startTime: '06:30',
    plannedMinutes: 60,
    repeat: { kind: 'daily', days: [] },
    date: null,
    activeFrom: '2026-10-01',
    activeTo: null,
    soundOverride: null,
    notes: 'Mobility first',
    createdAt: 0,
    updatedAt: 0,
    ...extra,
  }
}

describe('a draft from a saved task', () => {
  it('fills the form from the task', () => {
    expect(draftFromTask(savedTask(), TODAY)).toMatchObject({
      title: 'Morning workout',
      start: '06:30',
      duration: 60,
      kind: 'daily',
      color: 'movement',
      notes: 'Mobility first',
      date: TODAY,
      endMode: false,
    })
  })

  it('keeps custom days and a one-off date', () => {
    const custom = draftFromTask(savedTask({ repeat: { kind: 'custom', days: [6, 0] } }), TODAY)
    expect(custom.customDays).toEqual([6, 0])
    const once = draftFromTask(savedTask({ repeat: { kind: 'once', days: [] }, date: '2026-10-15' }), TODAY)
    expect(once).toMatchObject({ kind: 'once', date: '2026-10-15' })
  })

  it('an inbox to-do has no start yet, so the form cannot be saved until one is chosen', () => {
    const todo = savedTask({ title: 'Call the dentist', startTime: null, repeat: { kind: 'once', days: [] }, notes: '' })
    const d = draftFromTask(todo, TODAY)
    expect(d).toMatchObject({ title: 'Call the dentist', start: '', kind: 'once', date: TODAY })
    expect(canSave(d)).toBe(false)
    expect(canSave(setStart(d, '10:00'))).toBe(true)
  })

  it('an unchanged form is not dirty, and any change is', () => {
    const task = savedTask()
    const initial = draftFromTask(task, TODAY)
    expect(isDirty(draftFromTask(task, TODAY), initial)).toBe(false)
    expect(isDirty({ ...initial, title: 'Run' }, initial)).toBe(true)
  })
})

describe('Duplicate', () => {
  it('copies everything and adds "copy" to the title', () => {
    const d = copyDraft(savedTask(), TODAY)
    expect(d.title).toBe('Morning workout copy')
    expect(d).toMatchObject({ start: '06:30', duration: 60, kind: 'daily', color: 'movement', notes: 'Mobility first' })
    expect(canSave(d)).toBe(true)
  })
})

describe('duration choices', () => {
  it('are the usual 5-minute steps when the length is on the grid', () => {
    expect(durationChoices(60)).toBe(DURATION_OPTIONS)
  })

  it('include an odd length so the picker never shows a wrong value', () => {
    const choices = durationChoices(17)
    expect(choices).toContain(17)
    expect(choices.indexOf(17)).toBe(choices.indexOf(15) + 1)
    expect(choices).toHaveLength(DURATION_OPTIONS.length + 1)
  })
})

describe('"Apply changes to"', () => {
  it('names the real date in both descriptions', () => {
    expect(scopeDescriptions('2026-10-06', '2026-10-06')).toEqual({
      day: 'Changes Tue, Oct 6. The routine stays as it is.',
      future: 'From Tue, Oct 6 on. Past days keep their original plan.',
    })
  })

  it('"This day only" can change title, color, start and length, but only what differs', () => {
    const task = savedTask()
    const form = { ...draftFromTask(task, TODAY), title: ' Run ', start: '07:15' as const }
    expect(dayOnlyPatch(task, form)).toEqual({ title: 'Run', startTime: '07:15' })
    expect(dayOnlyPatch(task, { ...draftFromTask(task, TODAY), color: 'focus', duration: 45 })).toEqual({
      color: 'focus',
      plannedMinutes: 45,
    })
    expect(dayOnlyPatch(task, draftFromTask(task, TODAY))).toEqual({})
  })

  it('notices changes a single day cannot hold: repeat, date and notes', () => {
    const task = savedTask({ repeat: { kind: 'custom', days: [1, 3, 5] } })
    const same = draftFromTask(task, TODAY)
    expect(changesMoreThanOneDay(task, same)).toBe(false)
    expect(changesMoreThanOneDay(task, { ...same, title: 'x', start: '09:00' })).toBe(false) // day-sized changes
    expect(changesMoreThanOneDay(task, { ...same, kind: 'daily' })).toBe(true)
    expect(changesMoreThanOneDay(task, { ...same, customDays: [1, 3] })).toBe(true)
    expect(changesMoreThanOneDay(task, { ...same, customDays: [5, 1, 3] })).toBe(false) // same days, any order
    expect(changesMoreThanOneDay(task, { ...same, notes: 'new' })).toBe(true)
  })
})
