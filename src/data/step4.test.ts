import { describe, expect, it } from 'vitest'
import { hasEnded, occursOn } from './repeat'
import { setup } from './test-utils'
import type { Occurrence, Repeat, Task } from './types'
import { DataError } from './validate'

// "Today" is Thursday 8 October 2026 (see setup in test-utils.ts). Fri 9, Sat 10, Sun 11.
const daily: Repeat = { kind: 'daily', days: [] }
const weekdays: Repeat = { kind: 'weekdays', days: [] }
const PAST = ['2026-10-05', '2026-10-06', '2026-10-07']
const TODAY = '2026-10-08'
const FUTURE = ['2026-10-09', '2026-10-10', '2026-10-11']
const ALL = [...PAST, TODAY, ...FUTURE]

type Api = ReturnType<typeof setup>['api']

async function snapshot(api: Api, dates: string[]) {
  const out: Record<string, Occurrence[]> = {}
  for (const d of dates) out[d] = (await api.peekDay(d)).occurrences
  return out
}

/** A daily 6:30 workout since 1 Oct, with Oct 5 to 11 already opened and a few days logged. */
async function routine(repeat: Repeat = daily) {
  const ctx = setup()
  const task = await ctx.api.createTask({
    title: 'Workout',
    color: 'movement',
    startTime: '06:30',
    plannedMinutes: 60,
    repeat,
    activeFrom: '2026-10-01',
  })
  for (const d of ALL) await ctx.api.getDay(d)
  const blockOn = async (date: string) => (await ctx.api.peekDay(date)).occurrences.find((o) => o.taskId === task.id)!
  await ctx.api.updateOccurrence((await blockOn('2026-10-06')).id, { status: 'done', actualStart: '06:40', actualEnd: '07:35', note: 'Felt slow' })
  await ctx.api.updateOccurrence((await blockOn('2026-10-07')).id, { status: 'skipped' })
  return { ...ctx, task, blockOn }
}

const CHANGE = { title: 'Run', color: 'focus', startTime: '07:15', plannedMinutes: 45 } as const

describe('hasEnded', () => {
  it('is true only once the last day is behind us', () => {
    expect(hasEnded({ activeTo: null }, TODAY)).toBe(false)
    expect(hasEnded({ activeTo: '2026-10-08' }, TODAY)).toBe(false) // runs through today
    expect(hasEnded({ activeTo: '2026-10-07' }, TODAY)).toBe(true)
  })
})

describe('"This and future days" from today', () => {
  it('ends the old task yesterday and starts the changed one today', async () => {
    const { api, task } = await routine()
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)

    const old = (await api.getTask(task.id))!
    expect(old).toMatchObject({ activeFrom: '2026-10-01', activeTo: '2026-10-07', title: 'Workout', startTime: '06:30' })
    expect(next.id).not.toBe(task.id)
    expect(next).toMatchObject({ activeFrom: TODAY, activeTo: null, title: 'Run', color: 'focus', startTime: '07:15', plannedMinutes: 45 })
    expect(await api.listTasks()).toHaveLength(2)
  })

  it('leaves past days exactly as they were, logs included', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, PAST)
    await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    expect(await snapshot(api, PAST)).toEqual(before)
    for (const d of PAST) expect(before[d]![0]!.taskId).toBe(task.id) // still the old task's blocks
    expect(before['2026-10-06']![0]).toMatchObject({ status: 'done', actualStart: '06:40', note: 'Felt slow' })
  })

  it('moves today and later days to the new task with the new plan', async () => {
    const { api, task } = await routine()
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    const after = await snapshot(api, [TODAY, ...FUTURE])
    for (const d of [TODAY, ...FUTURE]) {
      expect(after[d]).toHaveLength(1)
      expect(after[d]![0]).toMatchObject({ taskId: next.id, title: 'Run', color: 'focus', plannedStart: '07:15', plannedMinutes: 45 })
    }
  })

  it("keeps today's log when today is already logged, and still has just one block that day", async () => {
    const { api, task, blockOn } = await routine()
    const logged = await api.updateOccurrence((await blockOn(TODAY)).id, { status: 'done', actualStart: '06:35', actualEnd: '07:30' })
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    const today = (await api.peekDay(TODAY)).occurrences
    expect(today).toHaveLength(1)
    expect(today[0]).toMatchObject({ id: logged.id, status: 'done', actualStart: '06:35', actualEnd: '07:30', taskId: next.id })
    expect(today[0]).toMatchObject({ title: 'Workout', plannedStart: '06:30', plannedMinutes: 60 }) // plan not rewritten
  })

  it('days opened later use the changed plan; days from the past still use the old one', async () => {
    const { api, task } = await routine()
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)

    const later = await api.getDay('2026-10-20') // never opened before
    expect(later).toHaveLength(1)
    expect(later[0]).toMatchObject({ taskId: next.id, title: 'Run', plannedStart: '07:15' })

    const earlier = await api.getDay('2026-10-03') // in the past, never opened before
    expect(earlier).toHaveLength(1)
    expect(earlier[0]).toMatchObject({ taskId: task.id, title: 'Workout', plannedStart: '06:30' })
  })

  it('never shows the old and the new version on the same day', async () => {
    const { api, task } = await routine()
    await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    const tasks = await api.listTasks()
    for (let day = 1; day <= 30; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`
      const hits = tasks.filter((t) => occursOn(t, date))
      expect(hits, date).toHaveLength(1)
    }
  })

  it('changing the repeat removes later blocks that no longer apply, but not past ones', async () => {
    const { api, task } = await routine()
    await api.updateTaskFromDate(task.id, { repeat: weekdays }, TODAY)
    expect((await api.peekDay('2026-10-10')).occurrences).toEqual([]) // Saturday
    expect((await api.peekDay('2026-10-11')).occurrences).toEqual([]) // Sunday
    expect((await api.peekDay('2026-10-09')).occurrences).toHaveLength(1) // Friday
  })

  it('keeps a change made to one day only', async () => {
    const { api, task } = await routine()
    await api.updateTaskForDay(task.id, '2026-10-09', { startTime: '10:30' })
    await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    expect((await api.peekDay('2026-10-09')).occurrences[0]).toMatchObject({ plannedStart: '10:30', title: 'Run' })
    expect((await api.peekDay('2026-10-10')).occurrences[0]).toMatchObject({ plannedStart: '07:15', title: 'Run' })
  })

  it('keeps the old end date on the new version', async () => {
    const { api, task } = await routine()
    await api.updateTask(task.id, { activeTo: '2026-10-31' })
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    expect(next.activeTo).toBe('2026-10-31')
  })

  it('a routine that only began today is changed in place (nothing earlier to protect)', async () => {
    const { api } = setup()
    const task = await api.createTask({ title: 'New habit', startTime: '08:00', repeat: daily })
    expect(task.activeFrom).toBe(TODAY)
    await api.getDay(TODAY)
    const next = await api.updateTaskFromDate(task.id, { title: 'Habit', startTime: '09:00' }, TODAY)
    expect(next.id).toBe(task.id)
    expect(await api.listTasks()).toHaveLength(1)
    expect((await api.peekDay(TODAY)).occurrences[0]).toMatchObject({ title: 'Habit', plannedStart: '09:00' })
  })
})

describe('"This and future days" from a future date', () => {
  it('leaves today and the days before it alone, and changes that date on', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, [...PAST, TODAY, '2026-10-09'])
    const next = await api.updateTaskFromDate(task.id, CHANGE, '2026-10-10')

    expect((await api.getTask(task.id))!.activeTo).toBe('2026-10-09')
    expect(next.activeFrom).toBe('2026-10-10')
    expect(await snapshot(api, [...PAST, TODAY, '2026-10-09'])).toEqual(before)
    for (const d of ['2026-10-10', '2026-10-11']) {
      expect((await api.peekDay(d)).occurrences[0]).toMatchObject({ taskId: next.id, title: 'Run', plannedStart: '07:15' })
    }
  })
})

describe('"This and future days" from a past date', () => {
  it('is treated as from today, so the past is never changed', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, PAST)
    const next = await api.updateTaskFromDate(task.id, CHANGE, '2026-10-06')
    expect(next.activeFrom).toBe(TODAY)
    expect((await api.getTask(task.id))!.activeTo).toBe('2026-10-07')
    expect(await snapshot(api, PAST)).toEqual(before)
  })
})

describe('"This day only"', () => {
  it('changes today only', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, ALL)
    const taskBefore = await api.getTask(task.id)
    await api.updateTaskForDay(task.id, TODAY, CHANGE)

    expect(await api.getTask(task.id)).toEqual(taskBefore) // the routine is untouched
    const after = await snapshot(api, ALL)
    expect(after[TODAY]![0]).toMatchObject({ title: 'Run', color: 'focus', plannedStart: '07:15', plannedMinutes: 45, taskId: task.id })
    for (const d of ALL.filter((x) => x !== TODAY)) expect(after[d], d).toEqual(before[d])
  })

  it('changes a future date only, creating that day if it is new', async () => {
    const { api, task } = await routine()
    expect((await api.peekDay('2026-10-14')).created).toBe(false)
    await api.updateTaskForDay(task.id, '2026-10-14', { startTime: '12:00' })
    expect((await api.peekDay('2026-10-14')).occurrences[0]).toMatchObject({ plannedStart: '12:00', title: 'Workout' })
    expect((await api.getDay('2026-10-15'))[0]).toMatchObject({ plannedStart: '06:30' }) // the next day is as usual
    expect((await api.getTask(task.id))!.startTime).toBe('06:30')
  })

  it('changes a past date only, and keeps its log', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, PAST)
    await api.updateTaskForDay(task.id, '2026-10-06', { plannedMinutes: 90 })
    const after = await snapshot(api, PAST)
    expect(after['2026-10-06']![0]).toMatchObject({ plannedMinutes: 90, status: 'done', actualStart: '06:40', note: 'Felt slow' })
    expect(after['2026-10-05']).toEqual(before['2026-10-05'])
    expect(after['2026-10-07']).toEqual(before['2026-10-07'])
  })

  it('changes only the fields given', async () => {
    const { api, task } = await routine()
    await api.updateTaskForDay(task.id, TODAY, { startTime: '08:00' })
    expect((await api.peekDay(TODAY)).occurrences[0]).toMatchObject({ plannedStart: '08:00', title: 'Workout', plannedMinutes: 60, color: 'movement' })
  })

  it('tidies the title', async () => {
    const { api, task } = await routine()
    await api.updateTaskForDay(task.id, TODAY, { title: '  Run  ' })
    expect((await api.peekDay(TODAY)).occurrences[0]!.title).toBe('Run')
  })

  it('refuses a day the routine does not run on', async () => {
    const { api, task } = await routine(weekdays)
    await expect(api.updateTaskForDay(task.id, '2026-10-10', { title: 'x' })).rejects.toThrow(DataError) // a Saturday
    await expect(api.updateTaskForDay('missing', TODAY, { title: 'x' })).rejects.toThrow(DataError)
  })

  it('refuses nonsense and changes nothing', async () => {
    const { api, task } = await routine()
    await expect(api.updateTaskForDay(task.id, TODAY, { plannedMinutes: 0 })).rejects.toThrow(DataError)
    await expect(api.updateTaskForDay(task.id, 'not-a-date', { title: 'x' })).rejects.toThrow(DataError)
    expect((await api.peekDay(TODAY)).occurrences[0]).toMatchObject({ title: 'Workout', plannedMinutes: 60 })
  })
})

describe('Delete', () => {
  it('a routine ends yesterday; past days, logs and the routine row stay', async () => {
    const { api, task, blockOn } = await routine()
    await api.updateOccurrence((await blockOn(TODAY)).id, { status: 'done', actualStart: '06:30', actualEnd: '07:30' })
    const pastBefore = await snapshot(api, PAST)
    await api.deleteTaskFromDate(task.id)

    const kept = (await api.getTask(task.id))!
    expect(kept.activeTo).toBe('2026-10-07')
    expect(hasEnded(kept, TODAY)).toBe(true)
    expect(await snapshot(api, PAST)).toEqual(pastBefore)
    expect((await api.peekDay(TODAY)).occurrences).toHaveLength(1) // the logged one stays
    expect((await api.peekDay(TODAY)).occurrences[0]!.status).toBe('done')
    for (const d of FUTURE) expect((await api.peekDay(d)).occurrences, d).toEqual([])
  })

  it('days opened afterwards: later ones have no block, earlier ones still do', async () => {
    const { api, task } = await routine()
    await api.deleteTaskFromDate(task.id)
    expect(await api.getDay('2026-10-20')).toEqual([])
    const earlier = await api.getDay('2026-10-03') // in the past, never opened
    expect(earlier).toHaveLength(1)
    expect(earlier[0]).toMatchObject({ taskId: task.id, title: 'Workout' })
  })

  it('from a future date, today and the days before keep their blocks', async () => {
    const { api, task } = await routine()
    await api.deleteTaskFromDate(task.id, '2026-10-10')
    expect((await api.getTask(task.id))!.activeTo).toBe('2026-10-09')
    for (const d of [TODAY, '2026-10-09']) expect((await api.peekDay(d)).occurrences, d).toHaveLength(1)
    for (const d of ['2026-10-10', '2026-10-11']) expect((await api.peekDay(d)).occurrences, d).toEqual([])
  })

  it('a date in the past counts as today, so earlier days are never touched', async () => {
    const { api, task } = await routine()
    const before = await snapshot(api, PAST)
    await api.deleteTaskFromDate(task.id, '2026-10-05')
    expect((await api.getTask(task.id))!.activeTo).toBe('2026-10-07')
    expect(await snapshot(api, PAST)).toEqual(before)
  })

  it('a routine that began today is removed outright', async () => {
    const { api } = setup()
    const task = await api.createTask({ title: 'New habit', startTime: '08:00', repeat: daily })
    await api.getDay(TODAY)
    await api.deleteTaskFromDate(task.id)
    expect(await api.getTask(task.id)).toBeUndefined()
    expect((await api.peekDay(TODAY)).occurrences).toEqual([])
  })

  it('a routine that already ended earlier keeps its earlier end date', async () => {
    const { api, task } = await routine()
    await api.updateTask(task.id, { activeTo: '2026-10-04' })
    await api.deleteTaskFromDate(task.id)
    expect((await api.getTask(task.id))!.activeTo).toBe('2026-10-04')
  })

  it('a one-off is removed, and a log it already has stays in history', async () => {
    const { api } = setup()
    const call = await api.createTask({ title: 'Call', startTime: '10:00', date: TODAY })
    const other = await api.createTask({ title: 'Other', startTime: '11:00', date: TODAY })
    const [first, second] = await api.getDay(TODAY)
    const callBlock = [first!, second!].find((o) => o.taskId === call.id)!
    await api.updateOccurrence(callBlock.id, { status: 'done', actualStart: '10:00', actualEnd: '10:30' })

    await api.deleteTaskFromDate(call.id)
    await api.deleteTaskFromDate(other.id)
    expect(await api.getTask(call.id)).toBeUndefined()
    const left = (await api.peekDay(TODAY)).occurrences
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ id: callBlock.id, status: 'done' }) // history kept
  })

  it('an inbox to-do is simply removed', async () => {
    const { api } = setup()
    const todo = await api.createTask({ title: 'Call the dentist' })
    await api.deleteTaskFromDate(todo.id)
    expect(await api.listTasks()).toEqual([])
  })

  it('does nothing for a task that is already gone', async () => {
    const { api } = setup()
    await expect(api.deleteTaskFromDate('missing')).resolves.toBeUndefined()
  })
})

describe('log counts', () => {
  it('counts blocks that have a status, times, a timer or a note', async () => {
    const { api, task, blockOn } = await routine()
    // Oct 6 is done and Oct 7 is skipped (see routine()); add a timer and a note-only block.
    await api.updateOccurrence((await blockOn('2026-10-09')).id, { timerStartedAt: Date.now() })
    await api.updateOccurrence((await blockOn('2026-10-10')).id, { note: 'remember towel' })
    expect(await api.taskLogCount(task.id)).toBe(4)
  })

  it('is zero when nothing was logged', async () => {
    const { api } = setup()
    const task = await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    await api.getDay(TODAY)
    expect(await api.taskLogCount(task.id)).toBe(0)
  })
})

describe('turning a one-off or to-do into a repeating task', () => {
  it('starts it today, so days that already happened do not get it', async () => {
    const { api } = setup()
    const once = await api.createTask({ title: 'Stretch', startTime: '18:00', date: TODAY })
    const next = await api.updateTask(once.id, { repeat: daily, date: null })
    expect(next.activeFrom).toBe(TODAY)
    expect(await api.getDay('2026-10-05')).toEqual([])
    expect(await api.getDay('2026-10-12')).toHaveLength(1)
  })
})

describe('the saved routine as the lists will see it', () => {
  it('after an edit there is one active routine and one ended one', async () => {
    const { api, task } = await routine()
    const next = await api.updateTaskFromDate(task.id, CHANGE, TODAY)
    const tasks: Task[] = await api.listTasks()
    const active = tasks.filter((t) => !hasEnded(t, TODAY))
    expect(active.map((t) => t.id)).toEqual([next.id])
  })
})

describe('duplicating an Inbox to-do', () => {
  it('createTask with the copy fields adds a second to-do that stays in the Inbox', async () => {
    const { api, clock } = setup()
    const todo = await api.createTask({ title: 'Call the dentist', color: 'personal', plannedMinutes: 15, notes: 'Ask about Friday' })
    // The list is ordered by creation time, so the copy has to be made a moment later.
    clock.current = new Date(clock.current.getTime() + 1000)
    const copy = await api.createTask({ title: 'Call the dentist copy', color: todo.color, plannedMinutes: todo.plannedMinutes, notes: todo.notes })
    expect(copy.id).not.toBe(todo.id)
    expect(copy).toMatchObject({ title: 'Call the dentist copy', color: 'personal', plannedMinutes: 15, notes: 'Ask about Friday', startTime: null, activeFrom: null })
    expect((await api.listTasks()).map((t) => t.title)).toEqual(['Call the dentist', 'Call the dentist copy'])
    expect((await api.getDay(TODAY)).length).toBe(0) // not on any day
  })
})
