import { describe, expect, it } from 'vitest'
import {
  actualMinutes,
  clearLogPatch,
  deviation,
  deviationTag,
  doneAsPlannedPatch,
  elapsedSeconds,
  formatElapsed,
  manualLogPatch,
  needsStillDoing,
  plannedEndMinutes,
  plannedEndMoment,
  progressLine,
  skippedPatch,
  startRelation,
  stopPatch,
  timeOfMoment,
} from './log'
import type { Occurrence } from './types'

const at = (h: number, m = 0, s = 0, day = 8) => new Date(2026, 9, day, h, m, s).getTime()
const TOLERANCES = { onTimeMin: 10, lengthPct: 10 }

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

describe('clock helpers', () => {
  it('reads the wall-clock time of a moment', () => {
    expect(timeOfMoment(at(9, 15, 40))).toBe('09:15')
    expect(timeOfMoment(at(0, 0))).toBe('00:00')
  })

  it('works out when a block is planned to end', () => {
    expect(plannedEndMinutes(block())).toBe(10 * 60 + 30)
    expect(plannedEndMoment(block())).toBe(at(10, 30))
    expect(plannedEndMinutes(block({ plannedStart: '23:30', plannedMinutes: 120 }))).toBe(24 * 60)
  })
})

describe('the timer is worked out from the saved start', () => {
  it('counts whole seconds since the start, however long the app was closed', () => {
    expect(elapsedSeconds(at(9, 15), at(10, 12, 12))).toBe(57 * 60 + 12)
    expect(elapsedSeconds(at(9, 15), at(9, 15, 0))).toBe(0)
    expect(elapsedSeconds(at(9, 15), at(9, 14))).toBe(0)
  })

  it('writes elapsed time as minutes:seconds, with hours when there are any', () => {
    expect(formatElapsed(57 * 60 + 12)).toBe('57:12')
    expect(formatElapsed(59)).toBe('0:59')
    expect(formatElapsed(3725)).toBe('1:02:05')
    expect(formatElapsed(-4)).toBe('0:00')
  })

  it('says how the start compares with the plan', () => {
    expect(startRelation('09:00', '09:15')).toBe('15 min after plan')
    expect(startRelation('09:00', '08:50')).toBe('10 min before plan')
    expect(startRelation('09:00', '09:00')).toBe('on plan')
    expect(startRelation('09:00', '10:30')).toBe('90 min after plan')
  })
})

describe('stopping a timer', () => {
  it('fills Started and Ended and marks the block done', () => {
    const o = block({ timerStartedAt: at(9, 15) })
    expect(stopPatch(o, at(10, 12, 12))).toEqual({
      status: 'done',
      actualStart: '09:15',
      actualEnd: '10:12',
      timerStartedAt: null,
      note: '',
    })
  })

  it('keeps the note that was already on the block', () => {
    const o = block({ timerStartedAt: at(9), note: 'Phone rang' })
    expect(stopPatch(o, at(9, 30)).note).toBe('Phone rang')
  })

  it('a timer stopped inside its first minute still ends after it started', () => {
    const o = block({ timerStartedAt: at(9, 15, 5) })
    const p = stopPatch(o, at(9, 15, 40))
    expect(p.actualStart).toBe('09:15')
    expect(p.actualEnd).toBe('09:16')
  })

  it('a timer stopped on a later day ends at the last minute of its own day', () => {
    const o = block({ plannedStart: '22:00', timerStartedAt: at(22, 30) })
    const p = stopPatch(o, at(3, 0, 0, 9))
    expect(p.actualStart).toBe('22:30')
    expect(p.actualEnd).toBe('23:59')
  })

  it('stopping at the planned end uses the planned end', () => {
    const o = block({ timerStartedAt: at(9, 15) })
    const p = stopPatch(o, at(14, 0), true)
    expect(p.actualStart).toBe('09:15')
    expect(p.actualEnd).toBe('10:30')
  })

  it('a timer started after the planned end keeps the planned length when stopped at the planned end', () => {
    const o = block({ timerStartedAt: at(11, 0) })
    const p = stopPatch(o, at(14, 0), true)
    expect(p.actualStart).toBe('11:00')
    expect(p.actualEnd).toBe('12:30')
  })

  it('refuses a block with no timer', () => {
    expect(() => stopPatch(block(), at(10))).toThrow()
  })
})

describe('the quick actions', () => {
  it('Done as planned copies the planned start and end', () => {
    expect(doneAsPlannedPatch(block(), '')).toEqual({
      status: 'done',
      actualStart: '09:00',
      actualEnd: '10:30',
      timerStartedAt: null,
      note: '',
    })
  })

  it('Done as planned also stops a running timer and keeps the note', () => {
    const p = doneAsPlannedPatch(block({ timerStartedAt: at(9, 5) }), 'Went well')
    expect(p.timerStartedAt).toBeNull()
    expect(p.note).toBe('Went well')
  })

  it('Done as planned stays inside the day', () => {
    const p = doneAsPlannedPatch(block({ plannedStart: '23:30', plannedMinutes: 60 }), '')
    expect(p.actualEnd).toBe('23:59')
  })

  it('Skipped has no times', () => {
    expect(skippedPatch('Too tired')).toEqual({
      status: 'skipped',
      actualStart: null,
      actualEnd: null,
      timerStartedAt: null,
      note: 'Too tired',
    })
  })

  it('clearing a log returns the block to unlogged', () => {
    expect(clearLogPatch()).toEqual({
      status: 'planned',
      actualStart: null,
      actualEnd: null,
      timerStartedAt: null,
      note: '',
    })
  })

  it('a log from typed times is done', () => {
    expect(manualLogPatch('09:15', '10:12', 'ok').status).toBe('done')
  })
})

describe('how a log compares with the plan', () => {
  const log = (actualStart: string, actualEnd: string) =>
    block({ plannedStart: '08:30', plannedMinutes: 30, actualStart, actualEnd })

  it('adds up the minutes logged', () => {
    expect(actualMinutes(log('08:30', '09:15'))).toBe(45)
    expect(actualMinutes(block())).toBeNull()
    expect(actualMinutes(block({ actualStart: '10:00', actualEnd: '09:00' }))).toBeNull()
  })

  it('exactly as planned is not off plan', () => {
    expect(deviation(log('08:30', '09:00'), TOLERANCES)).toEqual({ kind: 'none' })
  })

  it('a start within 10 minutes and a length within 10% is not off plan', () => {
    expect(deviation(log('08:40', '09:10'), TOLERANCES)).toEqual({ kind: 'none' })
    expect(deviation(block({ actualStart: '09:00', actualEnd: '10:35' }), TOLERANCES)).toEqual({ kind: 'none' })
  })

  it('running over is "+N min" (the design example: 8:30 to 9:15 against 30 min)', () => {
    const d = deviation(log('08:30', '09:15'), TOLERANCES)
    expect(d).toEqual({ kind: 'over', minutes: 15 })
    expect(deviationTag(d)).toBe('+15 min')
  })

  it('stopping early is a minus tag', () => {
    const d = deviation(block({ actualStart: '09:00', actualEnd: '09:57' }), TOLERANCES)
    expect(d).toEqual({ kind: 'short', minutes: 33 })
    expect(deviationTag(d)).toBe('−33 min')
  })

  it('a late start is reported before the length', () => {
    const d = deviation(block({ actualStart: '10:00', actualEnd: '11:30' }), TOLERANCES)
    expect(d).toEqual({ kind: 'late', minutes: 60 })
    expect(deviationTag(d)).toBe('Started 60 min late')
  })

  it('big differences are written in hours', () => {
    const d = deviation(block({ actualStart: '15:00', actualEnd: '21:40', plannedStart: '21:00', plannedMinutes: 40 }), TOLERANCES)
    expect(deviationTag(d)).toBe('Started 6 h early')
  })

  it('an early start says early', () => {
    const d = deviation(block({ actualStart: '08:30', actualEnd: '10:00' }), TOLERANCES)
    expect(deviationTag(d)).toBe('Started 30 min early')
  })

  it('exactly the tolerance is still on plan, one minute more is not', () => {
    expect(deviation(block({ actualStart: '09:10', actualEnd: '10:40' }), TOLERANCES).kind).toBe('none')
    expect(deviation(block({ actualStart: '09:11', actualEnd: '10:41' }), TOLERANCES).kind).toBe('late')
  })

  it('no tag when there is nothing to compare', () => {
    expect(deviationTag({ kind: 'none' })).toBeNull()
    expect(deviation(block(), TOLERANCES)).toEqual({ kind: 'none' })
  })
})

describe('the progress line', () => {
  it('57 of 90 min is partial', () => {
    const p = progressLine(90, 57)
    expect(p.text).toBe('57 of 90 min')
    expect(p.label).toBe('partial')
    expect(p.fraction).toBeCloseTo(0.633, 2)
  })

  it('more than planned is over plan and the bar is full', () => {
    const p = progressLine(30, 45)
    expect(p.label).toBe('over plan')
    expect(p.fraction).toBe(1)
  })

  it('the same as planned says so', () => {
    expect(progressLine(60, 60).label).toBe('as planned')
  })
})

describe('"Still doing...?"', () => {
  const running = block({ timerStartedAt: at(9, 15) }) // planned end 10:30

  it('is not asked before 2 hours after the planned end', () => {
    expect(needsStillDoing(running, at(12, 29))).toBe(false)
  })

  it('is asked from 2 hours after the planned end', () => {
    expect(needsStillDoing(running, at(12, 30))).toBe(true)
    expect(needsStillDoing(running, at(20, 0))).toBe(true)
  })

  it('is never asked about a block with no timer', () => {
    expect(needsStillDoing(block(), at(23, 0))).toBe(false)
  })

  it('a timer started after the planned end is asked 2 hours after it started', () => {
    const late = block({ timerStartedAt: at(14, 0) })
    expect(needsStillDoing(late, at(15, 59))).toBe(false)
    expect(needsStillDoing(late, at(16, 0))).toBe(true)
  })
})
