import { describe, expect, it, vi } from 'vitest'
import { DataError } from './validate'
import { setup } from './test-utils'
import type { Occurrence, Repeat } from './types'

// "Today" in these tests is Thursday 8 October 2026 (see setup in test-utils.ts).
const daily: Repeat = { kind: 'daily', days: [] }
const weekdays: Repeat = { kind: 'weekdays', days: [] }
const PAST = ['2026-10-05', '2026-10-06', '2026-10-07']
const FROM_TODAY = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']

async function daysOf(api: ReturnType<typeof setup>['api'], dates: string[]) {
  const out: Record<string, Occurrence[]> = {}
  for (const d of dates) out[d] = await api.getDay(d)
  return out
}

describe('settings', () => {
  it('are created with defaults on first launch', async () => {
    const { api } = setup()
    const s = await api.getSettings()
    expect(s).toMatchObject({
      soundsOn: true,
      chimeId: 'bamboo',
      timeFormat: '12h',
      dayStart: '05:00',
      dayEnd: '23:00',
      lastBackupAt: null,
      backupReminderDays: 7,
      installPromptDismissed: false,
      tolerances: { onTimeMin: 10, lengthPct: 10, zeroCreditMin: 60 },
    })
  })

  it('merge an update, including part of a nested group', async () => {
    const { api } = setup()
    await api.updateSettings({ timeFormat: '24h', tolerances: { onTimeMin: 15 } })
    const s = await api.getSettings()
    expect(s.timeFormat).toBe('24h')
    expect(s.tolerances).toEqual({ onTimeMin: 15, lengthPct: 10, zeroCreditMin: 60 })
    expect(s.soundsOn).toBe(true)
  })

  it('refuse values that make no sense', async () => {
    const { api } = setup()
    await expect(api.updateSettings({ tolerances: { zeroCreditMin: 5 } })).rejects.toThrow(DataError)
    await expect(api.updateSettings({ dayStart: '25:00' })).rejects.toThrow(DataError)
    await expect(api.updateSettings({ dayStart: '23:30' })).rejects.toThrow(DataError)
    expect((await api.getSettings()).dayStart).toBe('05:00')
  })

  it('come back after the stored row is lost', async () => {
    const { api, db } = setup()
    await api.getSettings()
    await db.settings.clear()
    expect((await api.getSettings()).chimeId).toBe('bamboo')
  })
})

describe('tasks', () => {
  it('start from sensible defaults', async () => {
    const { api } = setup()
    const t = await api.createTask({ title: '  Call the dentist  ' })
    expect(t).toMatchObject({
      title: 'Call the dentist',
      color: 'focus',
      startTime: null,
      plannedMinutes: 30,
      repeat: { kind: 'once', days: [] },
      date: null,
      activeFrom: null,
      activeTo: null,
      soundOverride: null,
      notes: '',
    })
    expect(t.id).toBeTruthy()
    expect(t.createdAt).toBe(t.updatedAt)
  })

  it('a repeating task starts today, not in the past', async () => {
    const { api } = setup()
    const t = await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    expect(t.activeFrom).toBe('2026-10-08')
  })

  it('a one-off with a time but no date gets today', async () => {
    const { api } = setup()
    const t = await api.createTask({ title: 'Call', startTime: '10:30' })
    expect(t.date).toBe('2026-10-08')
  })

  it('tidy up the repeat days', async () => {
    const { api } = setup()
    const t = await api.createTask({
      title: 'Gym',
      startTime: '07:00',
      repeat: { kind: 'custom', days: [5, 1, 5, 3] },
    })
    expect(t.repeat).toEqual({ kind: 'custom', days: [1, 3, 5] })
  })

  it('refuse a task that cannot work', async () => {
    const { api } = setup()
    const bad = [
      { title: '   ' },
      { title: 'x', startTime: '7:30' },
      { title: 'x', plannedMinutes: 0 },
      { title: 'x', plannedMinutes: 1.5 },
      { title: 'x', repeat: { kind: 'custom', days: [] } as Repeat },
      { title: 'x', repeat: { kind: 'custom', days: [7] } as Repeat },
      { title: 'x', activeFrom: '2026-10-09', activeTo: '2026-10-08' },
      { title: 'x', date: '2026-02-30' },
    ]
    for (const input of bad) await expect(api.createTask(input)).rejects.toThrow(DataError)
    expect(await api.listTasks()).toEqual([])
  })

  it('are listed oldest first', async () => {
    const { api, clock } = setup()
    await api.createTask({ title: 'B' })
    clock.current = new Date(2026, 9, 8, 9, 5)
    await api.createTask({ title: 'A' })
    expect((await api.listTasks()).map((t) => t.title)).toEqual(['B', 'A'])
  })

  it('can be changed and fetched', async () => {
    const { api, clock } = setup()
    const t = await api.createTask({ title: 'Old' })
    clock.current = new Date(2026, 9, 8, 10, 0)
    const u = await api.updateTask(t.id, { title: 'New', notes: 'hello', color: 'admin' })
    expect(u).toMatchObject({ id: t.id, title: 'New', notes: 'hello', color: 'admin', createdAt: t.createdAt })
    expect(u.updatedAt).toBeGreaterThan(t.updatedAt)
    expect(await api.getTask(t.id)).toEqual(u)
    await expect(api.updateTask('missing', { title: 'x' })).rejects.toThrow(DataError)
  })

  it('an undefined field in an update changes nothing', async () => {
    const { api } = setup()
    const t = await api.createTask({ title: 'Keep', startTime: '08:00' })
    const u = await api.updateTask(t.id, { title: undefined, startTime: undefined })
    expect(u.title).toBe('Keep')
    expect(u.startTime).toBe('08:00')
  })

  it('scheduling an inbox task as a repeating one starts it today', async () => {
    const { api } = setup()
    const t = await api.createTask({ title: 'Stretch' })
    const u = await api.updateTask(t.id, { startTime: '18:00', repeat: daily })
    expect(u.activeFrom).toBe('2026-10-08')
    expect((await api.getDay('2026-10-07')).length).toBe(0)
    expect((await api.getDay('2026-10-08')).length).toBe(1)
  })
})

describe('getDay', () => {
  it('creates the blocks from the tasks of that day, copying the plan', async () => {
    const { api } = setup()
    const late = await api.createTask({ title: 'Reading', color: 'personal', startTime: '21:00', plannedMinutes: 40, repeat: daily })
    const early = await api.createTask({ title: 'Workout', color: 'movement', startTime: '06:30', plannedMinutes: 60, repeat: daily })
    const day = await api.getDay('2026-10-08')
    expect(day.map((o) => o.title)).toEqual(['Workout', 'Reading']) // by start time
    expect(day[0]).toMatchObject({
      taskId: early.id,
      date: '2026-10-08',
      title: 'Workout',
      color: 'movement',
      plannedStart: '06:30',
      plannedMinutes: 60,
      status: 'planned',
      actualStart: null,
      actualEnd: null,
      timerStartedAt: null,
      note: '',
    })
    expect(day[1]?.taskId).toBe(late.id)
  })

  it('creates a day once and then only reads it', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    const first = await api.getDay('2026-10-09')
    const second = await api.getDay('2026-10-09')
    expect(second).toEqual(first)
    expect(second[0]?.id).toBe(first[0]?.id)
  })

  it('does not double up when asked twice at the same moment', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    const [a, b] = await Promise.all([api.getDay('2026-10-09'), api.getDay('2026-10-09')])
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0]?.id).toBe(b[0]?.id)
    expect((await api.counts()).occurrences).toBe(1)
  })

  it('leaves out inbox tasks and tasks that do not repeat on that day', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Inbox' })
    await api.createTask({ title: 'Weekday', startTime: '09:00', repeat: weekdays })
    await api.createTask({ title: 'Once', startTime: '10:00', date: '2026-10-09' })
    expect((await api.getDay('2026-10-10')).map((o) => o.title)).toEqual([]) // Saturday
    expect((await api.getDay('2026-10-09')).map((o) => o.title)).toEqual(['Weekday', 'Once'])
  })

  it('refuses a date that is not a date', async () => {
    const { api } = setup()
    await expect(api.getDay('2026-02-30')).rejects.toThrow(DataError)
    await expect(api.getDay('tomorrow')).rejects.toThrow(DataError)
  })

  it('peekDay looks without creating', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    expect(await api.peekDay('2026-10-09')).toEqual({ created: false, occurrences: [] })
    expect((await api.counts()).days).toBe(0)
    await api.getDay('2026-10-09')
    const peek = await api.peekDay('2026-10-09')
    expect(peek.created).toBe(true)
    expect(peek.occurrences).toHaveLength(1)
  })

  it('a task made later does not appear on a past day that already exists', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Old routine', startTime: '09:00', repeat: daily, activeFrom: '2026-10-01' })
    const before = await api.getDay('2026-10-06')
    await api.createTask({ title: 'New routine', startTime: '10:00', repeat: daily, activeFrom: '2026-10-01' })
    expect(await api.getDay('2026-10-06')).toEqual(before)
  })
})

describe('past occurrences never change when a task changes', () => {
  async function routine() {
    const ctx = setup()
    const task = await ctx.api.createTask({
      title: 'Workout',
      color: 'movement',
      startTime: '06:30',
      plannedMinutes: 60,
      repeat: daily,
      activeFrom: '2026-10-01',
    })
    const all = [...PAST, ...FROM_TODAY]
    const before = await daysOf(ctx.api, all)
    return { ...ctx, task, before }
  }

  it('editing the task leaves earlier days exactly as they were', async () => {
    const { api, task, before } = await routine()
    await api.updateTask(task.id, { title: 'Run', color: 'focus', startTime: '07:00', plannedMinutes: 45 })
    const after = await daysOf(api, [...PAST, ...FROM_TODAY])
    for (const d of PAST) expect(after[d], d).toEqual(before[d])
  })

  it('...while today and later days that are unlogged follow the edit', async () => {
    const { api, task, before } = await routine()
    await api.updateTask(task.id, { title: 'Run', color: 'focus', startTime: '07:00', plannedMinutes: 45 })
    const after = await daysOf(api, FROM_TODAY)
    for (const d of FROM_TODAY) {
      expect(after[d]).toHaveLength(1)
      expect(after[d]?.[0]).toMatchObject({ title: 'Run', color: 'focus', plannedStart: '07:00', plannedMinutes: 45 })
      expect(after[d]?.[0]?.id).toBe(before[d]?.[0]?.id) // same block, not a new one
    }
  })

  it('a day that has become the past stops following later edits', async () => {
    const { api, task, clock } = await routine()
    await api.updateTask(task.id, { startTime: '07:00' })
    clock.current = new Date(2026, 9, 11, 9, 0) // now it is Sunday the 11th
    const frozen = await daysOf(api, ['2026-10-08', '2026-10-09', '2026-10-10'])
    await api.updateTask(task.id, { startTime: '08:00', title: 'Later' })
    expect(await daysOf(api, ['2026-10-08', '2026-10-09', '2026-10-10'])).toEqual(frozen)
    expect((await api.getDay('2026-10-11'))[0]).toMatchObject({ plannedStart: '08:00', title: 'Later' })
  })

  it('changing the repeat removes later blocks that no longer apply but keeps the past', async () => {
    const { api, task, before } = await routine()
    await api.updateTask(task.id, { repeat: weekdays })
    // Weekend blocks from today on are gone (Sat 10, Sun 11); Thu 8 and Fri 9 stay.
    expect((await api.peekDay('2026-10-10')).occurrences).toEqual([])
    expect((await api.peekDay('2026-10-11')).occurrences).toEqual([])
    expect((await api.peekDay('2026-10-09')).occurrences).toHaveLength(1)
    for (const d of PAST) expect((await api.peekDay(d)).occurrences).toEqual(before[d])
  })

  it('ending a task keeps what already happened', async () => {
    const { api, task, before } = await routine()
    await api.updateTask(task.id, { activeTo: '2026-10-07' })
    for (const d of FROM_TODAY) expect((await api.peekDay(d)).occurrences).toEqual([])
    for (const d of PAST) expect((await api.peekDay(d)).occurrences).toEqual(before[d])
  })

  it('deleting a task keeps past days and logged blocks, and removes the rest', async () => {
    const { api, task, before } = await routine()
    const today = before['2026-10-08']![0]!
    await api.updateOccurrence(today.id, { status: 'done', actualStart: '06:30', actualEnd: '07:30' })
    await api.deleteTask(task.id)

    expect(await api.getTask(task.id)).toBeUndefined()
    for (const d of PAST) expect((await api.peekDay(d)).occurrences).toEqual(before[d])
    expect((await api.peekDay('2026-10-08')).occurrences).toHaveLength(1) // the logged one
    expect((await api.peekDay('2026-10-08')).occurrences[0]?.status).toBe('done')
    expect((await api.peekDay('2026-10-09')).occurrences).toEqual([])
  })

  it('a block that is already logged is never rewritten by an edit', async () => {
    const { api, task, before } = await routine()
    const today = before['2026-10-08']![0]!
    const logged = await api.updateOccurrence(today.id, { status: 'done', actualStart: '06:40', actualEnd: '07:20' })
    await api.updateTask(task.id, { title: 'Run', startTime: '07:00' })
    expect((await api.peekDay('2026-10-08')).occurrences[0]).toEqual(logged)
  })

  it('a block with a running timer counts as logged', async () => {
    const { api, task, before } = await routine()
    const today = before['2026-10-08']![0]!
    const running = await api.updateOccurrence(today.id, { timerStartedAt: Date.now() })
    await api.updateTask(task.id, { title: 'Run' })
    expect((await api.peekDay('2026-10-08')).occurrences[0]).toEqual(running)
  })

  it('a change made to one day only is kept when the routine changes', async () => {
    const { api, task, before } = await routine()
    const friday = before['2026-10-09']![0]!
    await api.updateOccurrence(friday.id, { plannedStart: '10:30' }) // this day only
    await api.updateTask(task.id, { startTime: '08:00', title: 'Run' })
    const after = (await api.peekDay('2026-10-09')).occurrences[0]
    expect(after).toMatchObject({ plannedStart: '10:30', title: 'Run' })
    expect((await api.peekDay('2026-10-10')).occurrences[0]).toMatchObject({ plannedStart: '08:00' })
  })

  it('a new task reaches days from today on that already exist, not the past', async () => {
    const { api } = await routine()
    const other = await api.createTask({ title: 'Reading', startTime: '21:00', repeat: daily, activeFrom: '2026-10-01' })
    for (const d of PAST) expect((await api.peekDay(d)).occurrences).toHaveLength(1)
    for (const d of FROM_TODAY) {
      const day = (await api.peekDay(d)).occurrences
      expect(day).toHaveLength(2)
      expect(day.some((o) => o.taskId === other.id)).toBe(true)
    }
  })
})

describe('updateOccurrence', () => {
  it('logs a block', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    const [occ] = await api.getDay('2026-10-08')
    const done = await api.updateOccurrence(occ!.id, {
      status: 'done',
      actualStart: '12:05',
      actualEnd: '12:30',
      note: 'Felt good',
    })
    expect(done).toMatchObject({ status: 'done', actualStart: '12:05', actualEnd: '12:30', note: 'Felt good' })
    expect((await api.getDay('2026-10-08'))[0]).toEqual(done)
  })

  it('cannot move a block to another task or date', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    const [occ] = await api.getDay('2026-10-08')
    const sneaky = { taskId: 'other', date: '2030-01-01', note: 'x' } as Parameters<typeof api.updateOccurrence>[1]
    const u = await api.updateOccurrence(occ!.id, sneaky)
    expect(u.taskId).toBe(occ!.taskId)
    expect(u.date).toBe('2026-10-08')
  })

  it('refuses bad values and unknown blocks', async () => {
    const { api } = setup()
    await api.createTask({ title: 'Walk', startTime: '12:00', repeat: daily })
    const [occ] = await api.getDay('2026-10-08')
    await expect(api.updateOccurrence(occ!.id, { actualStart: '12:5' })).rejects.toThrow(DataError)
    await expect(api.updateOccurrence(occ!.id, { status: 'finished' as 'done' })).rejects.toThrow(DataError)
    await expect(api.updateOccurrence('missing', { note: 'x' })).rejects.toThrow(DataError)
    expect((await api.getDay('2026-10-08'))[0]?.actualStart).toBeNull()
  })
})

describe('persistent storage', () => {
  it('records that the browser agreed', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    const { api } = setup(undefined, { persisted: async () => false, persist })
    const result = await api.requestPersistentStorage()
    expect(persist).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ supported: true, persisted: true })
    expect(await api.getStoragePersistence()).toEqual(result)
  })

  it('records a refusal', async () => {
    const { api } = setup(undefined, { persisted: async () => false, persist: async () => false })
    expect(await api.requestPersistentStorage()).toMatchObject({ supported: true, persisted: false })
  })

  it('does not ask again when it is already persistent', async () => {
    const persist = vi.fn()
    const { api } = setup(undefined, { persisted: async () => true, persist })
    expect(await api.requestPersistentStorage()).toMatchObject({ persisted: true })
    expect(persist).not.toHaveBeenCalled()
  })

  it('records that the browser has no such feature', async () => {
    const { api } = setup(undefined, null)
    expect(await api.requestPersistentStorage()).toMatchObject({ supported: false, persisted: false })
  })

  it('treats an error as "not persistent"', async () => {
    const { api } = setup(undefined, {
      persisted: async () => {
        throw new Error('nope')
      },
      persist: async () => true,
    })
    expect(await api.requestPersistentStorage()).toMatchObject({ supported: true, persisted: false })
  })

  it('initData opens the database, creates settings and records persistence', async () => {
    const { api } = setup(undefined, { persisted: async () => true, persist: async () => true })
    const result = await api.initData()
    expect(result.persisted).toBe(true)
    expect((await api.getSettings()).chimeId).toBe('bamboo')
    expect((await api.getStoragePersistence())?.persisted).toBe(true)
  })
})
