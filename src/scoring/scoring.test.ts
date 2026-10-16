import { describe, expect, it } from 'vitest'
import {
  loggedLength,
  overlapMinutes,
  scoreDay,
  scoreTask,
  startedByFor,
  taskScore,
  toPercent,
  wholePercents,
  type ScoringBlock,
} from './index'

function block(
  plannedStart: string,
  plannedMinutes: number,
  log: { status?: ScoringBlock['status']; start?: string; end?: string } = {},
): ScoringBlock {
  const done = log.start !== undefined && log.end !== undefined
  return {
    plannedStart,
    plannedMinutes,
    status: log.status ?? (done ? 'done' : 'planned'),
    actualStart: log.start ?? null,
    actualEnd: log.end ?? null,
  }
}

const hm = (h: number, m = 0) => h * 60 + m

describe('how many minutes of two spans are the same minutes', () => {
  it('counts only the part they share', () => {
    expect(overlapMinutes(hm(9), hm(10), hm(9, 30), hm(10, 30))).toBe(30)
    expect(overlapMinutes(hm(9), hm(10), hm(9), hm(10))).toBe(60)
    expect(overlapMinutes(hm(9), hm(11), hm(9, 15), hm(9, 45))).toBe(30)
  })

  it('is 0 when they do not touch, even when one ends where the other starts', () => {
    expect(overlapMinutes(hm(9), hm(10), hm(10), hm(11))).toBe(0)
    expect(overlapMinutes(hm(9), hm(10), hm(14), hm(15))).toBe(0)
  })
})

describe('the score of one block: the share of the planned time spent on plan', () => {
  it('done exactly as planned is 100%', () => {
    expect(taskScore(block('06:30', 60, { start: '06:30', end: '07:30' }))).toBe(1)
  })

  it('the case that looked wrong before: planned 2:50 to 3:08 pm, logged 2:53 to 2:57 pm', () => {
    // 4 of the 18 planned minutes were spent on plan: 22%, not 81%.
    const result = scoreTask(block('14:50', 18, { start: '14:53', end: '14:57' }))
    expect(result?.matchedMinutes).toBe(4)
    expect(result?.score).toBeCloseTo(4 / 18)
    expect(toPercent(result?.score ?? 0)).toBe(22)
  })

  it('started late: only the part inside the planned time counts', () => {
    // Planned 9:00 to 10:20, logged 10:00 to 11:20: just 10:00 to 10:20 matches, 20 of 80 minutes.
    expect(taskScore(block('09:00', 80, { start: '10:00', end: '11:20' }))).toBeCloseTo(0.25)
    // 15 minutes late on a 60-minute block: 45 of 60 minutes.
    expect(taskScore(block('09:00', 60, { start: '09:15', end: '10:15' }))).toBeCloseTo(0.75)
  })

  it('starting early counts the same way (only the planned minutes match)', () => {
    // Planned 9:00 to 10:00, logged 8:30 to 9:30: 9:00 to 9:30 matches.
    expect(taskScore(block('09:00', 60, { start: '08:30', end: '09:30' }))).toBeCloseTo(0.5)
  })

  it('stopping early scores the part you did (a partial log)', () => {
    // 57 of 90 minutes, started on time.
    expect(taskScore(block('09:00', 90, { start: '09:00', end: '09:57' }))).toBeCloseTo(57 / 90)
  })

  it('doing the block at a different time of day scores 0', () => {
    expect(taskScore(block('09:00', 60, { start: '14:00', end: '15:00' }))).toBe(0)
  })

  it('running longer than planned is not punished: all of the planned time was spent', () => {
    expect(taskScore(block('08:30', 30, { start: '08:30', end: '09:15' }))).toBe(1)
    // More than double the length, started on time: still 100% of the planned time was spent.
    expect(taskScore(block('09:00', 30, { start: '09:00', end: '10:30' }))).toBe(1)
  })

  it('a skipped block scores 0', () => {
    expect(scoreTask(block('12:00', 20, { status: 'skipped' }))).toEqual({ score: 0, matchedMinutes: 0 })
  })

  it('a block with no log has no score (Unknown)', () => {
    expect(taskScore(block('21:00', 40))).toBeNull()
  })

  it('a done block without usable times has no score either', () => {
    expect(taskScore({ ...block('09:00', 60), status: 'done' })).toBeNull()
    expect(taskScore(block('09:00', 60, { start: '10:00', end: '09:00' }))).toBeNull()
  })

  it('a block with no planned minutes has no score', () => {
    expect(taskScore(block('09:00', 0, { start: '09:00', end: '09:30' }))).toBeNull()
  })

  it('reads the length of a log', () => {
    expect(loggedLength(block('09:00', 60, { start: '09:15', end: '10:12' }))).toBe(57)
    expect(loggedLength(block('09:00', 60))).toBeNull()
  })
})

// docs/feature-spec.md, "Worked example".
const WORKED_EXAMPLE = [
  block('06:30', 60, { start: '06:30', end: '07:30' }), // Workout: 100%
  block('09:00', 80, { start: '10:00', end: '11:20' }), // Deep work: 20 of 80 minutes = 25%
  block('12:00', 20, { status: 'skipped' }), // Walk: 0%
  block('21:00', 40), // Reading: not logged
]

describe('the worked example from the spec', () => {
  const day = scoreDay(WORKED_EXAMPLE)

  it('Logged score is 50%, based on 160 of 200 planned minutes', () => {
    // 80 minutes were spent on plan out of the 160 planned minutes that were logged.
    expect(day.logged).toBeCloseTo(0.5)
    expect(toPercent(day.logged ?? 0)).toBe(50)
    expect(day.loggedMinutes).toBe(160)
    expect(day.plannedMinutes).toBe(200)
  })

  it('Day score is 40% followed, 40% missed, 20% unknown', () => {
    expect(day.followed).toBeCloseTo(0.4)
    expect(day.missed).toBeCloseTo(0.4)
    expect(day.unknown).toBeCloseTo(0.2)
    expect(day.percents).toEqual({ followed: 40, missed: 40, unknown: 20 })
  })

  it('so the real result is somewhere between 40% and 60%', () => {
    expect(day.range).toEqual({ low: 40, high: 60 })
  })

  it('Followed is simply the minutes spent on plan out of all the planned minutes', () => {
    const matched = day.items.reduce((sum, item) => sum + (scoreTask(item.block)?.matchedMinutes ?? 0), 0)
    expect(matched).toBe(80)
    expect(day.followed).toBeCloseTo(matched / day.plannedMinutes)
  })

  it('scores each block, with Unknown for the one not logged', () => {
    expect(day.items.map((i) => i.state)).toEqual(['done', 'done', 'skipped', 'unknown'])
    expect(day.items.map((i) => (i.score === null ? null : Math.round(i.score * 100)))).toEqual([100, 25, 0, null])
    expect(day.items.map((i) => i.weight)).toEqual([60, 80, 20, 40])
  })

  it('is part logged, with one block left to log', () => {
    expect(day.status).toBe('partial')
    expect(day.unloggedCount).toBe(1)
    expect(day.unknownMinutes).toBe(40)
  })
})

describe('display rules', () => {
  it('a fully logged day has no Unknown, so one number is enough', () => {
    const day = scoreDay(WORKED_EXAMPLE.slice(0, 3))
    expect(day.status).toBe('complete')
    expect(day.unknown).toBe(0)
    expect(day.percents.unknown).toBe(0)
    expect(day.unloggedCount).toBe(0)
    // Both scores say the same thing: Followed equals the Logged score.
    expect(day.followed).toBeCloseTo(day.logged ?? -1)
    expect(day.range.low).toBe(day.range.high)
  })

  it('nothing logged: the Logged score is "-" (null) and the Day bar is 100% Unknown', () => {
    const day = scoreDay([block('09:00', 60), block('10:00', 30)])
    expect(day.status).toBe('nothing-logged')
    expect(day.logged).toBeNull()
    expect(day.percents).toEqual({ followed: 0, missed: 0, unknown: 100 })
    expect(day.range).toEqual({ low: 0, high: 100 })
    expect(day.unloggedCount).toBe(2)
  })

  it('a block with a running timer is Unknown until it is stopped, but is not "left to log"', () => {
    const running = { ...block('09:00', 60), timerStartedAt: 1 }
    const day = scoreDay([running])
    expect(day.status).toBe('nothing-logged')
    expect(day.unloggedCount).toBe(0)
  })
})

describe('edge cases', () => {
  it('no planned minutes at all: nothing to score', () => {
    const day = scoreDay([])
    expect(day.status).toBe('empty')
    expect(day.plannedMinutes).toBe(0)
    expect(day.logged).toBeNull()
    expect(day.percents).toEqual({ followed: 0, missed: 0, unknown: 0 })
    expect(day.range).toEqual({ low: 0, high: 0 })
  })

  it('blocks of 0 minutes carry no weight and are left out', () => {
    const day = scoreDay([block('09:00', 0, { start: '09:00', end: '09:10' })])
    expect(day.status).toBe('empty')
    expect(day.items).toEqual([])
  })

  it('all skipped: Logged score is 0%, and it is all Missed', () => {
    const day = scoreDay([block('09:00', 60, { status: 'skipped' }), block('11:00', 30, { status: 'skipped' })])
    expect(day.status).toBe('complete')
    expect(day.logged).toBe(0)
    expect(day.percents).toEqual({ followed: 0, missed: 100, unknown: 0 })
  })

  it('a skipped block still counts as logged coverage', () => {
    const day = scoreDay([block('09:00', 60, { status: 'skipped' }), block('11:00', 60)])
    expect(day.loggedMinutes).toBe(60)
    expect(day.logged).toBe(0)
    expect(day.percents).toEqual({ followed: 0, missed: 50, unknown: 50 })
  })

  it('more than double the length, started on time: the whole plan was spent, so 100%', () => {
    const day = scoreDay([block('09:00', 30, { start: '09:00', end: '10:30' })])
    expect(day.logged).toBe(1)
    expect(day.percents).toEqual({ followed: 100, missed: 0, unknown: 0 })
  })

  it('starting early: only the planned minutes count', () => {
    const day = scoreDay([block('09:00', 60, { start: '08:30', end: '09:30' })])
    expect(day.logged).toBeCloseTo(0.5)
  })

  it('a longer block weighs more than a shorter one', () => {
    const day = scoreDay([block('09:00', 120, { start: '09:00', end: '11:00' }), block('12:00', 10, { status: 'skipped' })])
    // (120 minutes spent on plan) / (130 logged planned minutes)
    expect(day.logged).toBeCloseTo(120 / 130)
  })
})

describe('today: only blocks that have started count', () => {
  const today = [
    block('06:30', 60, { start: '06:30', end: '07:30' }),
    block('09:00', 60), // started, not logged
    block('15:00', 60), // later today
  ]

  it('leaves out a block whose planned start has not come', () => {
    const day = scoreDay(today, { startedBy: hm(10) })
    expect(day.plannedMinutes).toBe(120)
    expect(day.percents).toEqual({ followed: 50, missed: 0, unknown: 50 })
    expect(day.items).toHaveLength(2)
  })

  it('counts a block from the minute it starts', () => {
    expect(scoreDay(today, { startedBy: hm(15) }).plannedMinutes).toBe(180)
    expect(scoreDay(today, { startedBy: hm(14, 59) }).plannedMinutes).toBe(120)
  })

  it('before the first block starts there is nothing to score', () => {
    expect(scoreDay(today, { startedBy: hm(5) }).status).toBe('empty')
  })

  it('a finished day counts everything', () => {
    expect(scoreDay(today).plannedMinutes).toBe(180)
  })

  it('startedByFor: past day = all, today = now, future day = none', () => {
    expect(startedByFor('2026-10-07', '2026-10-08', hm(10))).toBeUndefined()
    expect(startedByFor('2026-10-08', '2026-10-08', hm(10))).toBe(hm(10))
    expect(scoreDay(today, { startedBy: startedByFor('2026-10-09', '2026-10-08', hm(10)) }).status).toBe('empty')
  })
})

describe('whole percentages add up to exactly 100', () => {
  it('keeps clean numbers as they are', () => {
    expect(wholePercents([0.6, 0.2, 0.2])).toEqual([60, 20, 20])
  })

  it('splits thirds as 34 / 33 / 33', () => {
    const parts = wholePercents([1 / 3, 1 / 3, 1 / 3])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
    expect(parts).toEqual([34, 33, 33])
  })

  it('always totals 100 for awkward splits', () => {
    for (const fractions of [
      [0.126, 0.374, 0.5],
      [0.005, 0.005, 0.99],
      [0.333, 0.333, 0.334],
      [0.7049, 0.1, 0.1951],
    ]) {
      expect(wholePercents(fractions).reduce((a, b) => a + b, 0)).toBe(100)
    }
  })

  it('is all zeros when there is nothing to split', () => {
    expect(wholePercents([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('a day with awkward minutes still adds up on screen', () => {
    const day = scoreDay([
      block('09:00', 70, { start: '09:05', end: '10:10' }),
      block('11:00', 30, { status: 'skipped' }),
      block('12:00', 35),
    ])
    const { followed, missed, unknown } = day.percents
    expect(followed + missed + unknown).toBe(100)
  })
})
