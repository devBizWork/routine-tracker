import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../../data'
import { actualBars, actualSpan } from './actuals'
import { PX_PER_MINUTE, yAt } from './plan'

const range = { start: 6 * 60, end: 22 * 60 }
const TOLERANCES = { onTimeMin: 10, lengthPct: 10 }
const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 8, h, m, s).getTime()

function block(patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: 'o1',
    taskId: 't1',
    date: '2026-10-08',
    title: 'Morning workout',
    color: 'movement',
    plannedStart: '06:30',
    plannedMinutes: 60,
    status: 'planned',
    actualStart: null,
    actualEnd: null,
    timerStartedAt: null,
    note: '',
    ...patch,
  }
}

describe('where the actual bars go', () => {
  it('a block done as planned gets a bar that lines up with it (Main.html: top 21, height 78)', () => {
    const done = block({ status: 'done', actualStart: '06:30', actualEnd: '07:30' })
    const [bar] = actualBars([done], at(12), range, TOLERANCES)
    expect(bar).toMatchObject({ id: 'o1', offPlan: false, running: false })
    expect(bar?.top).toBe(yAt(6 * 60 + 30, range) + 1)
    expect(bar?.height).toBeCloseTo(60 * PX_PER_MINUTE - 2)
  })

  it('a log that drifted is off plan, so its bar is apricot', () => {
    const drifted = block({
      plannedStart: '08:30',
      plannedMinutes: 30,
      status: 'done',
      actualStart: '08:30',
      actualEnd: '09:15',
    })
    expect(actualBars([drifted], at(12), range, TOLERANCES)[0]?.offPlan).toBe(true)
  })

  it('a running timer draws a bar from its start to now, with a square bottom', () => {
    const running = block({ plannedStart: '09:00', plannedMinutes: 90, timerStartedAt: at(9, 15) })
    const [bar] = actualBars([running], at(10, 12), range, TOLERANCES)
    expect(bar).toMatchObject({ running: true, offPlan: false })
    expect(bar?.top).toBe(yAt(9 * 60 + 15, range) + 1)
    expect(bar?.height).toBeCloseTo(57 * PX_PER_MINUTE - 2)
  })

  it('a skipped block and an unlogged block have no bar', () => {
    const skipped = block({ status: 'skipped' })
    expect(actualBars([skipped, block({ id: 'o2' })], at(12), range, TOLERANCES)).toEqual([])
  })

  it('a one-minute log is still tall enough to see', () => {
    const tiny = block({ status: 'done', actualStart: '07:00', actualEnd: '07:01' })
    expect(actualBars([tiny], at(12), range, TOLERANCES)[0]?.height).toBe(4)
  })
})

describe('the time a log covers', () => {
  it('reads the logged times', () => {
    const done = block({ status: 'done', actualStart: '06:30', actualEnd: '07:30' })
    expect(actualSpan(done, at(12))).toEqual({ start: 390, end: 450 })
  })

  it('a running timer covers its start to now, counting the seconds', () => {
    const span = actualSpan(block({ timerStartedAt: at(9, 15) }), at(10, 12, 30))
    expect(span?.start).toBe(9 * 60 + 15)
    expect(span?.end).toBeCloseTo(10 * 60 + 12.5)
  })

  it('has none for an unlogged block or a log with times the wrong way round', () => {
    expect(actualSpan(block(), at(12))).toBeNull()
    expect(actualSpan(block({ actualStart: '10:00', actualEnd: '09:00' }), at(12))).toBeNull()
  })
})
