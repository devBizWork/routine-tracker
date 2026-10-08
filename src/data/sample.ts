import { addDays } from './dates'
import { newId } from './ids'
import { occursOn } from './repeat'
import { minutesToTime, timeToMinutes } from './time'
import type { CategoryId, DateKey, DayRecord, Occurrence, Repeat, Task } from './types'

// Sample data for the Developer section: the 14 tasks from design/screens/Tasks.html,
// plus the last 7 days already logged in different ways.

interface SampleTask {
  title: string
  color: CategoryId
  startTime: string | null
  plannedMinutes: number
  repeat: Repeat
  /** For one-off tasks: how many days from today. */
  dayOffset?: number
}

const once: Repeat = { kind: 'once', days: [] }
const daily: Repeat = { kind: 'daily', days: [] }
const weekdays: Repeat = { kind: 'weekdays', days: [] }

// The design shows one color per row but in its old palette, so each task is placed
// in the closest of the six categories by what it is.
const SAMPLE_TASKS: readonly SampleTask[] = [
  // Inbox: not on the timeline yet
  { title: 'Call the dentist', color: 'personal', startTime: null, plannedMinutes: 15, repeat: once },
  { title: 'Return library books', color: 'personal', startTime: null, plannedMinutes: 20, repeat: once },
  { title: 'Plan weekend trip', color: 'planning', startTime: null, plannedMinutes: 30, repeat: once },
  // Routines
  { title: 'Morning workout', color: 'movement', startTime: '06:30', plannedMinutes: 60, repeat: daily },
  { title: 'Plan the day', color: 'planning', startTime: '07:45', plannedMinutes: 30, repeat: weekdays },
  { title: 'Meditate', color: 'personal', startTime: '08:00', plannedMinutes: 20, repeat: { kind: 'custom', days: [0, 6] } },
  { title: 'Email & messages', color: 'admin', startTime: '08:30', plannedMinutes: 30, repeat: weekdays },
  { title: 'Deep work', color: 'focus', startTime: '09:00', plannedMinutes: 90, repeat: weekdays },
  { title: 'Lunch walk', color: 'movement', startTime: '12:00', plannedMinutes: 30, repeat: daily },
  { title: 'Project work', color: 'focus', startTime: '13:00', plannedMinutes: 90, repeat: weekdays },
  { title: 'Evening reading', color: 'personal', startTime: '21:00', plannedMinutes: 40, repeat: daily },
  // One-off
  { title: 'Client check-in call', color: 'meetings', startTime: '10:30', plannedMinutes: 30, repeat: once, dayOffset: 0 },
  { title: 'Admin & invoices', color: 'admin', startTime: '11:15', plannedMinutes: 45, repeat: once, dayOffset: 0 },
  { title: 'Quarterly review prep', color: 'planning', startTime: '14:00', plannedMinutes: 60, repeat: once, dayOffset: 2 },
]

export const SAMPLE_PAST_DAYS = 7

type Outcome = 'onPlan' | 'late' | 'short' | 'long' | 'skipped' | 'unlogged'

// Handed out in turn so every kind of block shows up across the week.
const OUTCOMES: readonly Outcome[] = [
  'onPlan', 'onPlan', 'late', 'short', 'skipped', 'unlogged', 'onPlan', 'long', 'late', 'unlogged',
]

const NOTES: Partial<Record<Outcome, string>> = {
  late: 'Started late',
  short: 'Cut short',
  long: 'Ran over',
  skipped: 'Not today',
}

function logged(occ: Occurrence, outcome: Outcome): Occurrence {
  const start = timeToMinutes(occ.plannedStart)
  const length = occ.plannedMinutes
  const span = (from: number, minutes: number) => ({
    status: 'done' as const,
    actualStart: minutesToTime(from),
    actualEnd: minutesToTime(from + minutes),
  })

  switch (outcome) {
    case 'onPlan':
      return { ...occ, ...span(start, length) }
    case 'late':
      return { ...occ, ...span(start + 20, length), note: NOTES.late ?? '' }
    case 'short':
      return { ...occ, ...span(start, Math.max(5, Math.round(length * 0.6))), note: NOTES.short ?? '' }
    case 'long':
      return { ...occ, ...span(start, Math.round(length * 1.5)), note: NOTES.long ?? '' }
    case 'skipped':
      return { ...occ, status: 'skipped', note: NOTES.skipped ?? '' }
    case 'unlogged':
      return occ
  }
}

export interface SampleData {
  tasks: Task[]
  occurrences: Occurrence[]
  /** The past dates whose occurrences were created above. */
  days: DayRecord[]
}

export function buildSampleData(today: DateKey, nowMs: number): SampleData {
  const firstDay = addDays(today, -SAMPLE_PAST_DAYS)

  const tasks: Task[] = SAMPLE_TASKS.map((s, index) => {
    const isOneOff = s.repeat.kind === 'once' && s.dayOffset !== undefined
    return {
      id: newId(),
      title: s.title,
      color: s.color,
      startTime: s.startTime,
      plannedMinutes: s.plannedMinutes,
      repeat: structuredClone(s.repeat),
      date: isOneOff ? addDays(today, s.dayOffset ?? 0) : null,
      activeFrom: s.repeat.kind === 'once' ? null : firstDay,
      activeTo: null,
      soundOverride: null,
      notes: '',
      createdAt: nowMs - 8 * 24 * 60 * 60 * 1000 + index * 1000,
      updatedAt: nowMs - 8 * 24 * 60 * 60 * 1000 + index * 1000,
    }
  })

  const occurrences: Occurrence[] = []
  const days: DayRecord[] = []
  for (let back = SAMPLE_PAST_DAYS; back >= 1; back--) {
    const date = addDays(today, -back)
    days.push({ date, createdAt: nowMs })
    tasks
      .filter((t) => occursOn(t, date))
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
      .forEach((task, i) => {
        const planned: Occurrence = {
          id: newId(),
          taskId: task.id,
          date,
          title: task.title,
          color: task.color,
          plannedStart: task.startTime ?? '00:00',
          plannedMinutes: task.plannedMinutes,
          status: 'planned',
          actualStart: null,
          actualEnd: null,
          timerStartedAt: null,
          note: '',
        }
        occurrences.push(logged(planned, OUTCOMES[(back * 3 + i) % OUTCOMES.length] ?? 'onPlan'))
      })
  }

  return { tasks, occurrences, days }
}
