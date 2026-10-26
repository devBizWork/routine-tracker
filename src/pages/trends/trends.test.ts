import { describe, expect, it } from 'vitest'
import type { Occurrence, Task } from '../../data'
import { scoreDay } from '../../scoring'
import type { CalendarData } from '../calendar/month'
import {
  coverageOf,
  coverageSummary,
  currentPeriod,
  followedText,
  isCurrentPeriod,
  monthContaining,
  mostFollowed,
  mostSkipped,
  scoresSummary,
  shiftPeriod,
  skippedText,
  summarize,
  trendChange,
  trendDays,
  weekEndingOn,
  type TrendSummary,
} from './trends'

let counter = 0
function block(date: string, taskId: string, title: string, start: string, minutes: number, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: `o${++counter}`,
    taskId,
    date,
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

const done = (start: string, end: string): Partial<Occurrence> => ({ status: 'done', actualStart: start, actualEnd: end })
const skipped: Partial<Occurrence> = { status: 'skipped' }

describe('up or down from the period before', () => {
  const summary = (avgFollowed: number | null, loggedDays: number): TrendSummary => ({
    dataDays: loggedDays,
    loggedDays,
    avgFollowed,
    avgMissed: 0,
    coverage: 0,
  })

  it('is the difference in percentage points', () => {
    expect(trendChange(summary(61, 5), summary(55, 7))).toEqual({ delta: 6, direction: 'up' })
    expect(trendChange(summary(50, 5), summary(54, 7))).toEqual({ delta: 4, direction: 'down' })
    expect(trendChange(summary(50, 5), summary(50, 7))).toEqual({ delta: 0, direction: 'same' })
  })

  it('is not shown without enough logged days on both sides', () => {
    expect(trendChange(summary(61, 5), summary(55, 1))).toBeNull()
    expect(trendChange(summary(61, 1), summary(55, 5))).toBeNull()
    expect(trendChange(summary(null, 0), summary(55, 5))).toBeNull()
  })
})

describe('periods', () => {
  it('a week is the seven days ending on a day (design: Sep 30 – Oct 6)', () => {
    const week = weekEndingOn('2026-10-06')
    expect(week.from).toBe('2026-09-30')
    expect(week.to).toBe('2026-10-06')
    expect(week.days).toHaveLength(7)
    expect(week.title).toBe('Sep 30 – Oct 6')
  })

  it('a week across the new year shows the years', () => {
    expect(weekEndingOn('2027-01-02').title).toBe('Dec 27, 2026 – Jan 2, 2027')
  })

  it('a month is a calendar month, one point per day', () => {
    const month = monthContaining('2026-10-18')
    expect(month.from).toBe('2026-10-01')
    expect(month.to).toBe('2026-10-31')
    expect(month.days).toHaveLength(31)
    expect(month.title).toBe('October 2026')
    expect(monthContaining('2026-02-10').days).toHaveLength(28)
  })

  it('previous and next', () => {
    expect(shiftPeriod(weekEndingOn('2026-10-06'), -1).title).toBe('Sep 23 – Sep 29')
    expect(shiftPeriod(monthContaining('2026-10-06'), -1).title).toBe('September 2026')
    expect(shiftPeriod(monthContaining('2026-01-06'), -1).title).toBe('December 2025')
  })

  it('the current period holds today, so it has no next', () => {
    expect(isCurrentPeriod(currentPeriod('week', '2026-10-18'), '2026-10-18')).toBe(true)
    expect(isCurrentPeriod(currentPeriod('month', '2026-10-18'), '2026-10-18')).toBe(true)
    expect(isCurrentPeriod(shiftPeriod(currentPeriod('week', '2026-10-18'), -1), '2026-10-18')).toBe(false)
  })
})

describe('the days, the stat cards and Most skipped', () => {
  // Oct 4 to Oct 6, today is Oct 6 at 10:00.
  const occurrences = [
    block('2026-10-04', 'walk', 'Lunch walk', '12:00', 30, skipped),
    block('2026-10-04', 'deep', 'Deep work', '09:00', 60, done('09:00', '10:00')),
    block('2026-10-05', 'walk', 'Lunch walk', '12:00', 30, skipped),
    block('2026-10-05', 'deep', 'Deep work', '09:00', 60, done('09:30', '10:00')),
    block('2026-10-05', 'read', 'Reading', '21:00', 40),
    block('2026-10-06', 'deep', 'Deep work', '09:00', 60, done('09:00', '09:40')),
    block('2026-10-06', 'walk', 'Lunch walk', '12:00', 30), // later today: not counted
  ]
  const data: CalendarData = {
    today: '2026-10-06',
    nowMinutes: 10 * 60,
    created: new Set(['2026-10-04', '2026-10-05', '2026-10-06']),
    occurrences,
    tasks: [] as Task[],
    firstDataDate: '2026-10-04',
  }
  const days = trendDays(weekEndingOn('2026-10-06'), data)

  it('days before the data and after today have nothing; the rest use scoreDay', () => {
    expect(days.map((d) => d.hasData)).toEqual([false, false, false, false, true, true, true])
    const oct5 = days.find((d) => d.date === '2026-10-05')
    expect(oct5?.score?.percents).toEqual(scoreDay(occurrences.filter((o) => o.date === '2026-10-05')).percents)
  })

  it('today counts only the blocks that have started, and is marked', () => {
    const today = days.find((d) => d.isToday)
    expect(today?.score?.plannedMinutes).toBe(60)
  })

  it('stat cards: average Followed, average Missed and coverage', () => {
    const s = summarize(days)
    expect(s.dataDays).toBe(3)
    // Followed: Oct 4 = 60/90 = 67, Oct 5 = 30/130 = 23, Oct 6 = 40/60 = 67
    expect(s.avgFollowed).toBe(Math.round((67 + 23 + 67) / 3))
    // Coverage: logged 90 + 90 + 60 of planned 90 + 130 + 60
    expect(s.coverage).toBe(Math.round((240 / 280) * 100))
  })

  it('days with nothing logged do not pull the averages down (they are Unknown, not 0%)', () => {
    const extra = block('2026-10-03', 'deep', 'Deep work', '09:00', 60)
    const withEmptyDay = trendDays(weekEndingOn('2026-10-06'), {
      ...data,
      occurrences: [extra, ...occurrences],
      created: new Set(['2026-10-03', ...data.created]),
      firstDataDate: '2026-10-03',
    })
    const s = summarize(withEmptyDay)
    expect(s.dataDays).toBe(4)
    expect(s.loggedDays).toBe(3)
    expect(s.avgFollowed).toBe(summarize(days).avgFollowed)
    // Coverage still counts the unlogged hour.
    expect(s.coverage).toBe(Math.round((240 / 340) * 100))
  })

  it('no logged day at all: no averages', () => {
    const none = summarize(trendDays(weekEndingOn('2026-10-06'), { ...data, occurrences: [block('2026-10-05', 'x', 'X', '09:00', 30)], created: new Set(['2026-10-05']) }))
    expect(none.avgFollowed).toBeNull()
    expect(none.avgMissed).toBeNull()
  })

  it('coverage per day', () => {
    expect(days.filter((d) => d.hasData).map(coverageOf)).toEqual([100, 69, 100])
    expect(coverageOf(days[0]!)).toBeNull()
  })

  it('Most skipped lists the tasks skipped most, with how often they came up', () => {
    const top = mostSkipped(days)
    expect(top.map((t) => [t.title, t.skipped, t.days, t.unknown])).toEqual([['Lunch walk', 2, 2, 0]])
    expect(skippedText(top[0]!)).toEqual({ skipped: '2 of 2', rest: ' days' })
  })

  it('a task with Unknown blocks says so', () => {
    expect(skippedText({ taskId: 'r', title: 'Reading', color: 'focus', days: 4, skipped: 1, unknown: 3 })).toEqual({
      skipped: '1',
      rest: ' · unknown 3',
    })
  })

  it('keeps the top three, most skipped first', () => {
    const many = ['a', 'b', 'c', 'd'].flatMap((id, i) =>
      Array.from({ length: i + 1 }, (_, n) => block(`2026-10-0${n + 1}`, id, id.toUpperCase(), '08:00', 30, skipped)),
    )
    const d = trendDays(weekEndingOn('2026-10-06'), { ...data, occurrences: many, created: new Set(many.map((o) => o.date)), firstDataDate: '2026-10-01' })
    expect(mostSkipped(d).map((t) => t.title)).toEqual(['D', 'C', 'B'])
  })

  it('Most followed counts a day when any of the planned time was kept, not only 100%', () => {
    // Deep work: Oct 4 100%, Oct 5 50% (started late), Oct 6 so far 67%: followed 3 of 3 days.
    const top = mostFollowed(days)
    expect(top.map((t) => [t.title, t.followed, t.days])).toEqual([['Deep work', 3, 3]])
    expect(followedText(top[0]!)).toEqual({ followed: '3 of 3', rest: ' days' })
    // Lunch walk was only ever skipped, so it is not in the list.
    expect(top.map((t) => t.title)).not.toContain('Lunch walk')
  })

  it('Most followed breaks ties by how much of the plan was kept', () => {
    const tie = [
      block('2026-10-05', 'a', 'Alpha', '08:00', 60, done('08:30', '09:00')), // 50%
      block('2026-10-05', 'b', 'Beta', '10:00', 60, done('10:00', '11:00')), // 100%
    ]
    const d = trendDays(weekEndingOn('2026-10-06'), { ...data, occurrences: tie, created: new Set(['2026-10-05']) })
    expect(mostFollowed(d).map((t) => t.title)).toEqual(['Beta', 'Alpha'])
  })

  it('fewer than two days of data', () => {
    const one = trendDays(weekEndingOn('2026-10-06'), { ...data, firstDataDate: '2026-10-06' })
    expect(summarize(one).dataDays).toBe(1)
  })

  it('VoiceOver summaries read the numbers out', () => {
    expect(scoresSummary(days)).toContain('Sun Oct 4: 67% followed, 33% missed')
    expect(scoresSummary(days)).toContain('Tue Oct 6 so far: 67% followed')
    expect(coverageSummary(days)).toContain('Mon Oct 5: 69%')
    expect(scoresSummary([])).toBe('No scores in this period.')
  })
})
