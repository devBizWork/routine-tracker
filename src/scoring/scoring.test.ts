import { describe, expect, it } from 'vitest'
import {
  durationCredit,
  loggedLength,
  scoreDay,
  scoreTask,
  startedByFor,
  taskScore,
  timingCredit,
  toPercent,
  wholePercents,
  type ScoringBlock,
  type ScoringTolerances,
} from './index'

// The default Settings tolerances: 10 minutes, 10 percent, zero credit at 60 minutes.
const TOL: ScoringTolerances = { onTimeMin: 10, lengthPct: 10, zeroCreditMin: 60 }

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

describe('timing credit T', () => {
  it('is 1 within 10 minutes of the plan, early or late', () => {
    expect(timingCredit(0, TOL)).toBe(1)
    expect(timingCredit(10, TOL)).toBe(1)
    expect(timingCredit(-10, TOL)).toBe(1)
  })

  it('falls evenly to 0 at 60 minutes early or late', () => {
    expect(timingCredit(35, TOL)).toBeCloseTo(0.5)
    expect(timingCredit(-35, TOL)).toBeCloseTo(0.5)
    expect(timingCredit(60, TOL)).toBe(0)
    expect(timingCredit(-60, TOL)).toBe(0)
  })

  it('stays 0 beyond 60 minutes', () => {
    expect(timingCredit(61, TOL)).toBe(0)
    expect(timingCredit(-240, TOL)).toBe(0)
  })

  it('follows the tolerances from Settings', () => {
    const loose = { onTimeMin: 20, lengthPct: 10, zeroCreditMin: 120 }
    expect(timingCredit(20, loose)).toBe(1)
    expect(timingCredit(70, loose)).toBeCloseTo(0.5)
  })

  it('a zero-credit limit that is not above the on-time limit does not divide by zero', () => {
    expect(timingCredit(11, { onTimeMin: 10, lengthPct: 10, zeroCreditMin: 10 })).toBe(0)
  })
})

describe('duration credit D', () => {
  it('is 1 within 10% of the plan', () => {
    expect(durationCredit(60, 60, TOL)).toBe(1)
    expect(durationCredit(54, 60, TOL)).toBe(1)
    expect(durationCredit(66, 60, TOL)).toBe(1)
  })

  it('falls evenly to 0 at no time when shorter', () => {
    // 27 of 60 minutes: halfway between 0 and the 54 minutes that earn full credit.
    expect(durationCredit(27, 60, TOL)).toBeCloseTo(0.5)
    expect(durationCredit(0, 60, TOL)).toBe(0)
  })

  it('falls evenly to 0 at double the plan when longer', () => {
    // 93 of 60 minutes: halfway between 66 (full credit) and 120 (none).
    expect(durationCredit(93, 60, TOL)).toBeCloseTo(0.5)
    expect(durationCredit(120, 60, TOL)).toBe(0)
  })

  it('stays 0 for more than double the length', () => {
    expect(durationCredit(121, 60, TOL)).toBe(0)
    expect(durationCredit(600, 60, TOL)).toBe(0)
  })

  it('has no credit for a plan with no minutes', () => {
    expect(durationCredit(30, 0, TOL)).toBe(0)
  })

  it('a 100% tolerance accepts anything up to double the plan', () => {
    const wide = { ...TOL, lengthPct: 100 }
    expect(durationCredit(5, 60, wide)).toBe(1)
    expect(durationCredit(120, 60, wide)).toBe(1)
    expect(durationCredit(121, 60, wide)).toBe(0)
  })
})

describe('the score of one block', () => {
  it('a block done exactly as planned scores 100%', () => {
    expect(taskScore(block('06:30', 60, { start: '06:30', end: '07:30' }), TOL)).toBe(1)
  })

  it('the worked example: 60 minutes late with the right length scores 75%', () => {
    expect(taskScore(block('09:00', 80, { start: '10:00', end: '11:20' }), TOL)).toBeCloseTo(0.75)
  })

  it('returns the parts too', () => {
    const result = scoreTask(block('09:00', 80, { start: '10:00', end: '11:20' }), TOL)
    expect(result).toEqual({ score: 0.75, timing: 0, duration: 1 })
  })

  it('a skipped block scores 0', () => {
    expect(scoreTask(block('12:00', 20, { status: 'skipped' }), TOL)).toEqual({ score: 0, timing: 0, duration: 0 })
  })

  it('a block with no log has no score (Unknown)', () => {
    expect(taskScore(block('21:00', 40), TOL)).toBeNull()
  })

  it('a done block without usable times has no score either', () => {
    expect(taskScore({ ...block('09:00', 60), status: 'done' }, TOL)).toBeNull()
    expect(taskScore(block('09:00', 60, { start: '10:00', end: '09:00' }), TOL)).toBeNull()
  })

  it('starting early loses timing credit just like starting late', () => {
    // 30 minutes early: T = 1 - 20/50 = 0.6, same length: D = 1.
    expect(taskScore(block('09:00', 60, { start: '08:30', end: '09:30' }), TOL)).toBeCloseTo(0.5 + 0.25 * 0.6 + 0.25)
    // An hour early earns no timing credit, like the worked example's hour late.
    expect(taskScore(block('09:00', 80, { start: '08:00', end: '09:20' }), TOL)).toBeCloseTo(0.75)
    // Two hours early still cannot go below the 50% for doing it.
    expect(taskScore(block('09:00', 60, { start: '07:00', end: '08:00' }), TOL)).toBeCloseTo(0.75)
  })

  it('more than double the length earns no duration credit but keeps the 50% for doing it', () => {
    expect(taskScore(block('09:00', 30, { start: '09:00', end: '10:10' }), TOL)).toBeCloseTo(0.75) // T=1, D=0
    expect(taskScore(block('09:00', 30, { start: '10:00', end: '11:30' }), TOL)).toBeCloseTo(0.5) // T=0, D=0
  })

  it('a partial log (shorter than planned) scores between', () => {
    // 57 of 90 minutes: D = (57/90) / 0.9 = 0.7037, T = 1.
    expect(taskScore(block('09:00', 90, { start: '09:00', end: '09:57' }), TOL)).toBeCloseTo(0.5 + 0.25 + 0.25 * 0.7037, 3)
  })

  it('reads the length of a log', () => {
    expect(loggedLength(block('09:00', 60, { start: '09:15', end: '10:12' }))).toBe(57)
    expect(loggedLength(block('09:00', 60))).toBeNull()
  })
})

// docs/feature-spec.md, "Worked example".
const WORKED_EXAMPLE = [
  block('06:30', 60, { start: '06:30', end: '07:30' }), // Workout: 100%
  block('09:00', 80, { start: '10:00', end: '11:20' }), // Deep work: 75%
  block('12:00', 20, { status: 'skipped' }), // Walk: 0%
  block('21:00', 40), // Reading: not logged
]

describe('the worked example from the spec', () => {
  const day = scoreDay(WORKED_EXAMPLE, TOL)

  it('Logged score is 75%, based on 160 of 200 planned minutes', () => {
    expect(day.logged).toBeCloseTo(0.75)
    expect(toPercent(day.logged ?? 0)).toBe(75)
    expect(day.loggedMinutes).toBe(160)
    expect(day.plannedMinutes).toBe(200)
  })

  it('Day score is 60% followed, 20% missed, 20% unknown', () => {
    expect(day.followed).toBeCloseTo(0.6)
    expect(day.missed).toBeCloseTo(0.2)
    expect(day.unknown).toBeCloseTo(0.2)
    expect(day.percents).toEqual({ followed: 60, missed: 20, unknown: 20 })
  })

  it('so the real result is somewhere between 60% and 80%', () => {
    expect(day.range).toEqual({ low: 60, high: 80 })
  })

  it('scores each block, with Unknown for the one not logged', () => {
    expect(day.items.map((i) => i.state)).toEqual(['done', 'done', 'skipped', 'unknown'])
    expect(day.items.map((i) => (i.score === null ? null : Math.round(i.score * 100)))).toEqual([100, 75, 0, null])
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
    const day = scoreDay(WORKED_EXAMPLE.slice(0, 3), TOL)
    expect(day.status).toBe('complete')
    expect(day.unknown).toBe(0)
    expect(day.percents.unknown).toBe(0)
    expect(day.unloggedCount).toBe(0)
    // Both scores say the same thing: Followed equals the Logged score.
    expect(day.followed).toBeCloseTo(day.logged ?? -1)
    expect(day.range.low).toBe(day.range.high)
  })

  it('nothing logged: the Logged score is "-" (null) and the Day bar is 100% Unknown', () => {
    const day = scoreDay([block('09:00', 60), block('10:00', 30)], TOL)
    expect(day.status).toBe('nothing-logged')
    expect(day.logged).toBeNull()
    expect(day.percents).toEqual({ followed: 0, missed: 0, unknown: 100 })
    expect(day.range).toEqual({ low: 0, high: 100 })
    expect(day.unloggedCount).toBe(2)
  })

  it('a block with a running timer is Unknown until it is stopped, but is not "left to log"', () => {
    const running = { ...block('09:00', 60), timerStartedAt: 1 }
    const day = scoreDay([running], TOL)
    expect(day.status).toBe('nothing-logged')
    expect(day.unloggedCount).toBe(0)
  })
})

describe('edge cases', () => {
  it('no planned minutes at all: nothing to score', () => {
    const day = scoreDay([], TOL)
    expect(day.status).toBe('empty')
    expect(day.plannedMinutes).toBe(0)
    expect(day.logged).toBeNull()
    expect(day.percents).toEqual({ followed: 0, missed: 0, unknown: 0 })
    expect(day.range).toEqual({ low: 0, high: 0 })
  })

  it('blocks of 0 minutes carry no weight and are left out', () => {
    const day = scoreDay([block('09:00', 0, { start: '09:00', end: '09:10' })], TOL)
    expect(day.status).toBe('empty')
    expect(day.items).toEqual([])
  })

  it('all skipped: Logged score is 0%, and it is all Missed', () => {
    const day = scoreDay([block('09:00', 60, { status: 'skipped' }), block('11:00', 30, { status: 'skipped' })], TOL)
    expect(day.status).toBe('complete')
    expect(day.logged).toBe(0)
    expect(day.percents).toEqual({ followed: 0, missed: 100, unknown: 0 })
  })

  it('a skipped block still counts as logged coverage', () => {
    const day = scoreDay([block('09:00', 60, { status: 'skipped' }), block('11:00', 60)], TOL)
    expect(day.loggedMinutes).toBe(60)
    expect(day.logged).toBe(0)
    expect(day.percents).toEqual({ followed: 0, missed: 50, unknown: 50 })
  })

  it('more than double the length: the block still counts, with only the 50% (and timing)', () => {
    const day = scoreDay([block('09:00', 30, { start: '09:00', end: '10:30' })], TOL)
    expect(day.logged).toBeCloseTo(0.75)
    expect(day.percents).toEqual({ followed: 75, missed: 25, unknown: 0 })
  })

  it('starting early: both scores follow from the earlier start', () => {
    const day = scoreDay([block('09:00', 60, { start: '08:30', end: '09:30' })], TOL)
    expect(day.logged).toBeCloseTo(0.5 + 0.25 * 0.6 + 0.25)
  })

  it('a longer block weighs more than a shorter one', () => {
    const day = scoreDay(
      [block('09:00', 120, { start: '09:00', end: '11:00' }), block('12:00', 10, { status: 'skipped' })],
      TOL,
    )
    // (120 * 1 + 10 * 0) / 130
    expect(day.logged).toBeCloseTo(120 / 130)
  })

  it('uses the tolerances from Settings', () => {
    const strict = { onTimeMin: 0, lengthPct: 0, zeroCreditMin: 10 }
    const late = block('09:00', 60, { start: '09:05', end: '10:05' })
    expect(scoreDay([late], TOL).logged).toBe(1)
    expect(scoreDay([late], strict).logged).toBeCloseTo(0.5 + 0.25 * 0.5 + 0.25)
  })
})

describe('today: only blocks that have started count', () => {
  const today = [
    block('06:30', 60, { start: '06:30', end: '07:30' }),
    block('09:00', 60), // started, not logged
    block('15:00', 60), // later today
  ]

  it('leaves out a block whose planned start has not come', () => {
    const day = scoreDay(today, TOL, { startedBy: hm(10) })
    expect(day.plannedMinutes).toBe(120)
    expect(day.percents).toEqual({ followed: 50, missed: 0, unknown: 50 })
    expect(day.items).toHaveLength(2)
  })

  it('counts a block from the minute it starts', () => {
    expect(scoreDay(today, TOL, { startedBy: hm(15) }).plannedMinutes).toBe(180)
    expect(scoreDay(today, TOL, { startedBy: hm(14, 59) }).plannedMinutes).toBe(120)
  })

  it('before the first block starts there is nothing to score', () => {
    expect(scoreDay(today, TOL, { startedBy: hm(5) }).status).toBe('empty')
  })

  it('a finished day counts everything', () => {
    expect(scoreDay(today, TOL).plannedMinutes).toBe(180)
  })

  it('startedByFor: past day = all, today = now, future day = none', () => {
    expect(startedByFor('2026-10-07', '2026-10-08', hm(10))).toBeUndefined()
    expect(startedByFor('2026-10-08', '2026-10-08', hm(10))).toBe(hm(10))
    expect(scoreDay(today, TOL, { startedBy: startedByFor('2026-10-09', '2026-10-08', hm(10)) }).status).toBe('empty')
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
    const day = scoreDay(
      [block('09:00', 70, { start: '09:00', end: '10:10' }), block('11:00', 30, { status: 'skipped' }), block('12:00', 35)],
      TOL,
    )
    const { followed, missed, unknown } = day.percents
    expect(followed + missed + unknown).toBe(100)
  })
})
