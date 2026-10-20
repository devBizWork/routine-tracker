import { endOfMonth, format } from 'date-fns'
import {
  addDays,
  occursOn,
  parseDateKey,
  toDateKey,
  type CategoryId,
  type DateKey,
  type OccurrenceStatus,
  type TimeOfDay,
} from '../../data'
import { scoreDay, startedByFor, type DayScore, type ScoringBlock } from '../../scoring'
import type { CalendarData } from '../calendar/month'

// The rules behind the Trends screen (design/screens/Trends.html), kept apart from the screen so
// they can be tested. Every day's numbers come from the Step 7 scoreDay.

export type PeriodKind = 'week' | 'month'

export interface Period {
  kind: PeriodKind
  /** First and last day, both included. */
  from: DateKey
  to: DateKey
  /** Every day of the period, in order. */
  days: DateKey[]
  /** "Sep 30 – Oct 6" or "October 2026" */
  title: string
}

function daysBetween(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

/** A week is the seven days ending on `end` (the current week ends today, like the design). */
export function weekEndingOn(end: DateKey): Period {
  const from = addDays(end, -6)
  const sameYear = from.slice(0, 4) === end.slice(0, 4)
  const title = `${format(parseDateKey(from), sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(parseDateKey(end), sameYear ? 'MMM d' : 'MMM d, yyyy')}`
  return { kind: 'week', from, to: end, days: daysBetween(from, end), title }
}

/** A month is a calendar month. */
export function monthContaining(date: DateKey): Period {
  const d = parseDateKey(date)
  const from = toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
  const to = toDateKey(endOfMonth(d))
  return { kind: 'month', from, to, days: daysBetween(from, to), title: format(d, 'MMMM yyyy') }
}

export function currentPeriod(kind: PeriodKind, today: DateKey): Period {
  return kind === 'week' ? weekEndingOn(today) : monthContaining(today)
}

export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === 'week') return weekEndingOn(addDays(period.to, 7 * delta))
  const d = parseDateKey(period.from)
  return monthContaining(toDateKey(new Date(d.getFullYear(), d.getMonth() + delta, 1)))
}

/** The period that holds today: there is no "next" from it. */
export function isCurrentPeriod(period: Period, today: DateKey): boolean {
  return period.from <= today && today <= period.to
}

// ---- One day ----

/** What the tasks would give on a day never opened (in memory only), or the saved blocks. */
interface TrendBlock extends ScoringBlock {
  taskId: string
  title: string
  color: CategoryId
}

function trendBlocks(date: DateKey, data: CalendarData): TrendBlock[] {
  if (data.created.has(date)) return data.occurrences.filter((o) => o.date === date)
  return data.tasks
    .filter((t) => t.startTime !== null && occursOn(t, date))
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      color: t.color,
      plannedStart: t.startTime as TimeOfDay,
      plannedMinutes: t.plannedMinutes,
      status: 'planned' as OccurrenceStatus,
      actualStart: null,
      actualEnd: null,
    }))
}

export interface TrendDay {
  date: DateKey
  isToday: boolean
  /** There is something to show: a past or current day, after the first data, with blocks that count. */
  hasData: boolean
  score: DayScore<TrendBlock> | null
}

export function trendDays(period: Period, data: CalendarData): TrendDay[] {
  return period.days.map((date) => {
    const isToday = date === data.today
    if (date > data.today || data.firstDataDate === null || date < data.firstDataDate) {
      return { date, isToday, hasData: false, score: null }
    }
    const score = scoreDay(trendBlocks(date, data), { startedBy: startedByFor(date, data.today, data.nowMinutes) })
    return { date, isToday, hasData: score.status !== 'empty', score }
  })
}

// ---- The three stat cards ----

export interface TrendSummary {
  /** Days with something to show. */
  dataDays: number
  /** Days with something logged: the averages are over these only. */
  loggedDays: number
  /**
   * Average of each day's Followed percentage, over days with something logged (a day with nothing
   * logged is Unknown, not 0%, as everywhere else in the app). null when no day has a log.
   */
  avgFollowed: number | null
  /** Average of each day's Missed percentage, over the same days. */
  avgMissed: number | null
  /** Planned minutes logged out of all planned minutes counted, as a whole percentage. */
  coverage: number
}

export function summarize(days: readonly TrendDay[]): TrendSummary {
  const withData = days.filter((d) => d.hasData && d.score)
  const n = withData.length
  let followed = 0
  let missed = 0
  let logged = 0
  let planned = 0
  let loggedDays = 0
  for (const day of withData) {
    if (!day.score) continue
    if (day.score.loggedMinutes > 0) {
      loggedDays += 1
      followed += day.score.percents.followed
      missed += day.score.percents.missed
    }
    logged += day.score.loggedMinutes
    planned += day.score.plannedMinutes
  }
  return {
    dataDays: n,
    loggedDays,
    avgFollowed: loggedDays ? Math.round(followed / loggedDays) : null,
    avgMissed: loggedDays ? Math.round(missed / loggedDays) : null,
    coverage: planned ? Math.round((logged / planned) * 100) : 0,
  }
}

/** Trends needs at least this many days with something logged before it draws anything. */
export const MIN_TREND_DAYS = 2

/** A day's coverage: the share of its counted planned minutes that is logged (whole percent). */
export function coverageOf(day: TrendDay): number | null {
  if (!day.hasData || !day.score || day.score.plannedMinutes === 0) return null
  return Math.round((day.score.loggedMinutes / day.score.plannedMinutes) * 100)
}

// ---- Most skipped ----

export interface SkippedTask {
  taskId: string
  title: string
  color: CategoryId
  /** Days the task had a counted block in the period. */
  days: number
  skipped: number
  unknown: number
}

/**
 * The tasks skipped most often in the period (top `limit`), counting only blocks that have started.
 * Ties are broken by the most Unknown, then by name. Tasks never skipped are left out.
 */
export function mostSkipped(days: readonly TrendDay[], limit = 3): SkippedTask[] {
  const byTask = new Map<string, SkippedTask>()
  for (const day of days) {
    if (!day.score) continue
    for (const item of day.score.items) {
      const b = item.block
      const entry = byTask.get(b.taskId) ?? { taskId: b.taskId, title: b.title, color: b.color, days: 0, skipped: 0, unknown: 0 }
      entry.days += 1
      if (item.state === 'skipped') entry.skipped += 1
      if (item.state === 'unknown') entry.unknown += 1
      entry.title = b.title
      entry.color = b.color
      byTask.set(b.taskId, entry)
    }
  }
  return [...byTask.values()]
    .filter((t) => t.skipped > 0)
    .sort((a, b) => b.skipped - a.skipped || b.unknown - a.unknown || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/** "Skipped 3 of 7 days" or, with Unknown blocks, "Skipped 1 · unknown 3". */
export function skippedText(task: SkippedTask): { skipped: string; rest: string } {
  if (task.unknown > 0) return { skipped: `${task.skipped}`, rest: ` · unknown ${task.unknown}` }
  return { skipped: `${task.skipped} of ${task.days}`, rest: ` ${task.days === 1 ? 'day' : 'days'}` }
}

// ---- Words for VoiceOver ----

function dayName(date: DateKey): string {
  return format(parseDateKey(date), 'EEE MMM d')
}

/** One sentence per day: "Wed Sep 30: 68% followed, 20% missed." */
export function scoresSummary(days: readonly TrendDay[]): string {
  const parts = days
    .filter((d) => d.hasData && d.score)
    .map((d) => {
      const s = d.score as DayScore<TrendBlock>
      return `${dayName(d.date)}${d.isToday ? ' so far' : ''}: ${s.percents.followed}% followed, ${s.percents.missed}% missed`
    })
  return parts.length ? `Day score by day. ${parts.join('. ')}.` : 'No scores in this period.'
}

export function coverageSummary(days: readonly TrendDay[]): string {
  const parts = days.flatMap((d) => {
    const c = coverageOf(d)
    return c === null ? [] : [`${dayName(d.date)}${d.isToday ? ' so far' : ''}: ${c}%`]
  })
  return parts.length ? `Share of planned minutes logged by day. ${parts.join('. ')}.` : 'Nothing logged in this period.'
}
