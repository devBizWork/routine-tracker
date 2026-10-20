import { addDays as addDaysToDate, addMonths, format, startOfMonth, startOfWeek } from 'date-fns'
import {
  addDays,
  occursOn,
  parseDateKey,
  toDateKey,
  type DateKey,
  type Occurrence,
  type Task,
} from '../../data'
import { scoreDay, startedByFor, type DayScore, type ScoringBlock } from '../../scoring'

// The rules behind the Calendar tab and the Day screen's week strip (design/screens/Calendar.html,
// Day.html), kept apart from the screens so they can be tested. Every score comes from the Step 7
// scoreDay; nothing here works a score out on its own.

/** A month: year and month index (0 = January). */
export interface MonthRef {
  year: number
  month: number
}

export function monthOf(date: DateKey): MonthRef {
  const d = parseDateKey(date)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const d = addMonths(new Date(ref.year, ref.month, 1), delta)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** "October 2026" */
export function monthTitle(ref: MonthRef): string {
  return format(new Date(ref.year, ref.month, 1), 'MMMM yyyy')
}

export function inMonth(date: DateKey, ref: MonthRef): boolean {
  const d = parseDateKey(date)
  return d.getFullYear() === ref.year && d.getMonth() === ref.month
}

/** The weeks shown for a month, Monday first, from the week of the 1st to the week of the last day. */
export function monthGrid(ref: MonthRef): DateKey[][] {
  const first = startOfMonth(new Date(ref.year, ref.month, 1))
  let day = startOfWeek(first, { weekStartsOn: 1 })
  const weeks: DateKey[][] = []
  do {
    const week: DateKey[] = []
    for (let i = 0; i < 7; i++) {
      week.push(toDateKey(day))
      day = addDaysToDate(day, 1)
    }
    weeks.push(week)
  } while (day.getMonth() === ref.month && day.getFullYear() === ref.year)
  return weeks
}

/** The first and last day the month grid shows (text, so it is safe to use as a dependency). */
export function gridRange(ref: MonthRef): { from: DateKey; to: DateKey } {
  const weeks = monthGrid(ref)
  return { from: weeks[0]?.[0] ?? '', to: weeks[weeks.length - 1]?.[6] ?? '' }
}

/** Monday and Sunday of the week a date is in. */
export function weekRange(date: DateKey): { from: DateKey; to: DateKey } {
  const week = weekOf(date)
  return { from: week[0] ?? date, to: week[6] ?? date }
}

/** The Monday-to-Sunday week a date is in. */
export function weekOf(date: DateKey): DateKey[] {
  const monday = toDateKey(startOfWeek(parseDateKey(date), { weekStartsOn: 1 }))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/**
 * The first day there is anything to show: the first day ever opened (created), or the day the
 * earliest task was made, whichever is earlier. Days before it show nothing.
 */
export function firstDataDate(firstDay: DateKey | null, tasks: readonly Pick<Task, 'createdAt'>[]): DateKey | null {
  const candidates = [...(firstDay ? [firstDay] : []), ...tasks.map((t) => toDateKey(new Date(t.createdAt)))]
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (a < b ? a : b))
}

/** What a day shows on the Calendar. */
export type DayInfo =
  /** Before any data: nothing at all. */
  | { kind: 'none' }
  /** A day to come: only how much is planned. */
  | { kind: 'future'; blocks: number; minutes: number }
  /** Today or a past day: how much was planned and the Step 7 scores (empty when nothing is planned). */
  | { kind: 'scored'; blocks: number; minutes: number; score: DayScore<ScoringBlock> }

export interface CalendarData {
  today: DateKey
  /** Minutes after midnight now (for today's "so far"). */
  nowMinutes: number
  /** Days whose blocks already exist. */
  created: ReadonlySet<DateKey>
  /** The blocks of those days. */
  occurrences: readonly Occurrence[]
  tasks: readonly Task[]
  firstDataDate: DateKey | null
}

/**
 * The blocks of a day: the saved ones once the day exists, otherwise what the tasks would give
 * (worked out in memory only, nothing is written), so a day never opened still shows its plan.
 */
export function blocksOn(date: DateKey, data: Pick<CalendarData, 'created' | 'occurrences' | 'tasks'>): ScoringBlock[] {
  if (data.created.has(date)) return data.occurrences.filter((o) => o.date === date)
  return data.tasks
    .filter((t) => t.startTime !== null && occursOn(t, date))
    .map((t) => ({
      plannedStart: t.startTime ?? '00:00',
      plannedMinutes: t.plannedMinutes,
      status: 'planned' as const,
      actualStart: null,
      actualEnd: null,
    }))
}

export function dayInfo(date: DateKey, data: CalendarData): DayInfo {
  const blocks = blocksOn(date, data)
  const minutes = blocks.reduce((sum, b) => sum + b.plannedMinutes, 0)
  if (date > data.today) return { kind: 'future', blocks: blocks.length, minutes }
  if (data.firstDataDate === null || date < data.firstDataDate) return { kind: 'none' }
  const score = scoreDay(blocks, { startedBy: startedByFor(date, data.today, data.nowMinutes) })
  return { kind: 'scored', blocks: blocks.length, minutes, score }
}

/** "4 blocks · 200 min" */
export function plannedLine(blocks: number, minutes: number): string {
  if (blocks === 0) return 'Nothing planned'
  return `${blocks} ${blocks === 1 ? 'block' : 'blocks'} · ${minutes} min`
}

// ---- Remembering the Calendar while you are in it ----
// The month and selected day are kept while you go from the Calendar into a Day screen or Day review
// and back. Visiting another tab (Today, Tasks, Settings) forgets them, so the Calendar opens on today.

let remembered: { month: MonthRef; selected: DateKey } | null = null

/** The month and day the Calendar showed last time (kept while the app is open). */
export function rememberedCalendar(today: DateKey): { month: MonthRef; selected: DateKey } {
  return remembered ?? { month: monthOf(today), selected: today }
}

export function rememberCalendar(month: MonthRef, selected: DateKey) {
  remembered = { month, selected }
}

/** Forget the shown month and day: the next Calendar visit starts on today. */
export function forgetCalendar() {
  remembered = null
}

/**
 * Is this address part of the Calendar (the tab itself, Trends, a Day screen or a Day review)? Leaving
 * for any other address is "leaving the Calendar".
 */
export function isCalendarPath(pathname: string): boolean {
  return pathname === '/calendar' || pathname === '/trends' || pathname.startsWith('/day/')
}
