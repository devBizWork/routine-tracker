import { describe, expect, it } from 'vitest'
import {
  DURATION_OPTIONS,
  QUICK_DURATIONS,
  canSave,
  daysOf,
  endValue,
  initialDraft,
  isDirty,
  repeatProblem,
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
