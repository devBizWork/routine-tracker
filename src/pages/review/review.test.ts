import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../../data'
import { scoreDay } from '../../scoring'
import { backTarget, isReviewDate, reviewPath, reviewState } from './nav'
import { driftSummary, reviewRows } from './rows'

const TOL = { onTimeMin: 10, lengthPct: 10, zeroCreditMin: 60 }

let counter = 0
function block(title: string, start: string, minutes: number, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: `o${++counter}`,
    taskId: 't',
    date: '2026-10-05',
    title,
    color: 'focus',
    plannedStart: start,
    plannedMinutes: minutes,
    status: 'planned',
    actualStart: null,
    actualEnd: null,
    timerStartedAt: null,
    note: '',
    ...patch,
  }
}

// docs/feature-spec.md, "Worked example" (design/screens/DayReview.html shows the same day).
const WORKED_EXAMPLE = [
  block('Morning workout', '06:30', 60, { status: 'done', actualStart: '06:30', actualEnd: '07:30' }),
  block('Deep work', '09:00', 80, { status: 'done', actualStart: '10:00', actualEnd: '11:20' }),
  block('Lunch walk', '12:00', 20, { status: 'skipped' }),
  block('Evening reading', '21:00', 40),
]

describe('what each row of Planned vs actual says', () => {
  const rows = reviewRows(scoreDay(WORKED_EXAMPLE).items, TOL, '12h')

  it('one row per block, with its score', () => {
    expect(rows.map((r) => r.title)).toEqual(['Morning workout', 'Deep work', 'Lunch walk', 'Evening reading'])
    expect(rows.map((r) => (r.score === null ? null : Math.round(r.score * 100)))).toEqual([100, 25, 0, null])
    expect(rows.map((r) => r.state)).toEqual(['done', 'done', 'skipped', 'unknown'])
  })

  it('plan and actual times are written like the design', () => {
    expect(rows[0]?.planText).toBe('Plan 6:30 – 7:30 am')
    expect(rows[0]?.actualText).toBe('Actual 6:30 – 7:30 am')
    expect(rows[1]?.planText).toBe('Plan 9:00 – 10:20 am')
    expect(rows[1]?.actualText).toBe('Actual 10:00 – 11:20 am')
    expect(rows[2]?.planText).toBe('Plan 12:00 – 12:20 pm')
    expect(rows[3]?.planText).toBe('Plan 9:00 – 9:40 pm')
  })

  it('a skipped block says Skipped, an unlogged one Not logged, with no actual bar', () => {
    expect(rows[2]?.actualText).toBe('Skipped')
    expect(rows[2]?.actualBar).toBeNull()
    expect(rows[3]?.actualText).toBe('Not logged')
    expect(rows[3]?.actualBar).toBeNull()
  })

  it('a block done as planned has bars that line up (design: both full width)', () => {
    expect(rows[0]?.planBar).toEqual({ left: 0, width: 100 })
    expect(rows[0]?.actualBar).toEqual({ left: 0, width: 100 })
  })

  it('a late block has its bars offset over the span of both (design: plan 0-57%, actual 43-100%)', () => {
    const plan = rows[1]?.planBar
    const actual = rows[1]?.actualBar
    expect(plan?.left).toBe(0)
    expect(plan?.width).toBeCloseTo(57.1, 0)
    expect(actual?.left).toBeCloseTo(42.9, 0)
    expect(actual?.width).toBeCloseTo(57.1, 0)
  })

  it('only the block that drifted has a note about it', () => {
    expect(rows.map((r) => r.drift)).toEqual([null, 'Started 60 min late · length on plan', null, null])
  })

  it('a running timer is "Timer running", not "Not logged"', () => {
    const running = block('Reading', '21:00', 40, { timerStartedAt: 1 })
    const [row] = reviewRows(scoreDay([running]).items, TOL, '12h')
    expect(row?.running).toBe(true)
    expect(row?.actualText).toBe('Timer running')
  })

  it('follows the 24-hour setting', () => {
    const [row] = reviewRows(scoreDay([WORKED_EXAMPLE[0] as Occurrence]).items, TOL, '24h')
    expect(row?.planText).toBe('Plan 06:30 – 07:30')
  })
})

describe('how a log drifted', () => {
  const log = (start: string, end: string) => ({
    plannedStart: '09:00',
    plannedMinutes: 60,
    actualStart: start,
    actualEnd: end,
  })

  it('on plan says nothing', () => {
    expect(driftSummary(log('09:00', '10:00'), TOL)).toBeNull()
    expect(driftSummary(log('09:10', '10:10'), TOL)).toBeNull()
  })

  it('late with the right length', () => {
    expect(driftSummary(log('10:00', '11:00'), TOL)).toBe('Started 60 min late · length on plan')
  })

  it('on time but longer or shorter', () => {
    expect(driftSummary(log('09:00', '10:15'), TOL)).toBe('Started on time · 15 min over')
    expect(driftSummary(log('09:00', '09:30'), TOL)).toBe('Started on time · 30 min short')
  })

  it('early and long at once', () => {
    expect(driftSummary(log('08:30', '10:30'), TOL)).toBe('Started 30 min early · 60 min over')
  })

  it('has nothing to say without a log', () => {
    expect(driftSummary({ plannedStart: '09:00', plannedMinutes: 60, actualStart: null, actualEnd: null }, TOL)).toBeNull()
  })
})

describe('where Back goes', () => {
  it('returns to Today when the review was opened from Today', () => {
    expect(backTarget(reviewState('today'))).toEqual({ to: '/', label: 'Today' })
  })

  it('returns to the Calendar when it was opened from there', () => {
    expect(backTarget(reviewState('calendar'))).toEqual({ to: '/calendar', label: 'Calendar' })
  })

  it('opened directly (no note of where from) goes to Today', () => {
    expect(backTarget(null)).toEqual({ to: '/', label: 'Today' })
    expect(backTarget(undefined)).toEqual({ to: '/', label: 'Today' })
    expect(backTarget({ from: 'somewhere else' })).toEqual({ to: '/', label: 'Today' })
    expect(backTarget('calendar')).toEqual({ to: '/', label: 'Today' })
  })
})

describe('the review address', () => {
  it('is #/day/:date/review', () => {
    expect(reviewPath('2026-10-05')).toBe('/day/2026-10-05/review')
  })

  it('accepts real dates only', () => {
    expect(isReviewDate('2026-10-05')).toBe(true)
    expect(isReviewDate('2026-02-30')).toBe(false)
    expect(isReviewDate('today')).toBe(false)
    expect(isReviewDate(undefined)).toBe(false)
  })
})
