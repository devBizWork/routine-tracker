import { dayOfWeek } from './dates'
import type { DateKey, Task } from './types'

type Schedulable = Pick<Task, 'startTime' | 'repeat' | 'date' | 'activeFrom' | 'activeTo'>

/**
 * Does this task appear on this date?
 *
 * - Inbox tasks (no start time) never appear on a day.
 * - A task only appears from activeFrom to activeTo, both days included.
 * - once: only on its own date.   daily: every day.
 * - weekdays: Monday to Friday.   custom: the chosen days of the week.
 */
export function occursOn(task: Schedulable, date: DateKey): boolean {
  if (task.startTime === null) return false
  if (task.activeFrom !== null && date < task.activeFrom) return false
  if (task.activeTo !== null && date > task.activeTo) return false

  switch (task.repeat.kind) {
    case 'once':
      return task.date === date
    case 'daily':
      return true
    case 'weekdays': {
      const day = dayOfWeek(date)
      return day >= 1 && day <= 5
    }
    case 'custom':
      return task.repeat.days.includes(dayOfWeek(date))
  }
}
