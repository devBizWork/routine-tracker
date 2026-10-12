import { describe, expect, it } from 'vitest'
import { setup } from './test-utils' // first: it installs the simulated IndexedDB before Dexie loads
import { createDataApi, isUnlogged } from './api'

// The timer and the log, run against the real database code (a simulated IndexedDB).

async function twoBlocks() {
  const env = setup(new Date(2026, 9, 8, 9, 0))
  const { api } = env
  await api.createTask({ title: 'Deep work', color: 'focus', startTime: '09:00', plannedMinutes: 90, repeat: { kind: 'once', days: [] }, date: '2026-10-08' })
  await api.createTask({ title: 'Client check-in call', color: 'meetings', startTime: '10:30', plannedMinutes: 30, repeat: { kind: 'once', days: [] }, date: '2026-10-08' })
  const [deep, call] = await api.getDay('2026-10-08')
  if (!deep || !call) throw new Error('blocks missing')
  return { ...env, deep, call }
}

describe('the timer', () => {
  it('Start saves the moment it began', async () => {
    const { api, clock, deep } = await twoBlocks()
    clock.current = new Date(2026, 9, 8, 9, 15)
    const started = await api.startTimer(deep.id)
    expect(started.timerStartedAt).toBe(new Date(2026, 9, 8, 9, 15).getTime())
    expect((await api.peekOccurrence(deep.id))?.timerStartedAt).toBe(started.timerStartedAt)
  })

  it('a running timer counts as logged, so the plan cannot rewrite the block', async () => {
    const { api, deep } = await twoBlocks()
    expect(isUnlogged(deep)).toBe(true)
    const started = await api.startTimer(deep.id)
    expect(isUnlogged(started)).toBe(false)
  })

  it('starting a timer that is already running changes nothing', async () => {
    const { api, clock, deep } = await twoBlocks()
    const first = await api.startTimer(deep.id)
    clock.current = new Date(2026, 9, 8, 9, 30)
    const again = await api.startTimer(deep.id)
    expect(again.timerStartedAt).toBe(first.timerStartedAt)
  })

  it('Stop fills Started and Ended and marks the block done', async () => {
    const { api, clock, deep } = await twoBlocks()
    clock.current = new Date(2026, 9, 8, 9, 15)
    await api.startTimer(deep.id)
    clock.current = new Date(2026, 9, 8, 10, 12, 30)
    const stopped = await api.stopTimer(deep.id)
    expect(stopped).toMatchObject({ status: 'done', actualStart: '09:15', actualEnd: '10:12', timerStartedAt: null })
  })

  it('the timer survives closing the app: the answer comes from the saved start', async () => {
    const { api, db, clock, deep } = await twoBlocks()
    clock.current = new Date(2026, 9, 8, 9, 15)
    await api.startTimer(deep.id)
    // A new copy of the data layer on the same database is "the app opened again".
    clock.current = new Date(2026, 9, 8, 11, 0)
    const reopened = createDataApi({ db, now: () => clock.current, storage: null })
    const running = await reopened.runningTimers()
    expect(running.map((o) => o.id)).toEqual([deep.id])
    expect(running[0]?.timerStartedAt).toBe(new Date(2026, 9, 8, 9, 15).getTime())
  })

  it('stopping a block with no timer is refused', async () => {
    const { api, deep } = await twoBlocks()
    await expect(api.stopTimer(deep.id)).rejects.toThrow('No timer is running')
  })

  it('Stop at planned end uses the planned end', async () => {
    const { api, clock, deep } = await twoBlocks()
    clock.current = new Date(2026, 9, 8, 9, 15)
    await api.startTimer(deep.id)
    clock.current = new Date(2026, 9, 8, 14, 0)
    const stopped = await api.stopTimer(deep.id, { atPlannedEnd: true })
    expect(stopped).toMatchObject({ actualStart: '09:15', actualEnd: '10:30' })
  })
})

describe('one timer at a time', () => {
  it('refuses a second timer unless the first is stopped with it', async () => {
    const { api, deep, call } = await twoBlocks()
    await api.startTimer(deep.id)
    await expect(api.startTimer(call.id)).rejects.toThrow('Another timer is running')
    expect((await api.runningTimers()).map((o) => o.id)).toEqual([deep.id])
  })

  it('stopOthers stops the first one (saving its time) and starts the second', async () => {
    const { api, clock, deep, call } = await twoBlocks()
    clock.current = new Date(2026, 9, 8, 9, 15)
    await api.startTimer(deep.id)
    clock.current = new Date(2026, 9, 8, 10, 31)
    await api.startTimer(call.id, { stopOthers: true })
    const first = await api.peekOccurrence(deep.id)
    expect(first).toMatchObject({ status: 'done', actualStart: '09:15', actualEnd: '10:31', timerStartedAt: null })
    expect((await api.runningTimers()).map((o) => o.id)).toEqual([call.id])
  })

  it('a block that already has a log cannot be timed until the log is cleared', async () => {
    const { api, deep } = await twoBlocks()
    await api.updateOccurrence(deep.id, { status: 'skipped' })
    await expect(api.startTimer(deep.id)).rejects.toThrow('already has a log')
  })

  it('a missing block is reported', async () => {
    const { api } = await twoBlocks()
    await expect(api.startTimer('nope')).rejects.toThrow('no longer exists')
    await expect(api.stopTimer('nope')).rejects.toThrow('no longer exists')
  })
})
