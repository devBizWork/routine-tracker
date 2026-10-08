import { addDays } from './dates'
import { occursOn } from './repeat'
import { timeToMinutes } from './time'
import type { DateKey, Repeat, Task, TimeOfDay } from './types'

/** The parts of a block that decide whether it collides with another. */
export interface BlockShape {
  startTime: TimeOfDay
  plannedMinutes: number
  repeat: Repeat
  /** The day of a "once" block. */
  date: DateKey | null
}

/**
 * Which existing tasks would share time with this block on at least one day?
 * Blocks that only touch (one ends exactly when the next starts) do not overlap.
 * Inbox tasks are not on the timeline, so they never overlap anything.
 */
export function findOverlaps(block: BlockShape, tasks: readonly Task[], today: DateKey): Task[] {
  const start = timeToMinutes(block.startTime)
  const end = start + block.plannedMinutes

  // The new block, as the task it would become (a repeating one starts today).
  const candidate = {
    startTime: block.startTime,
    repeat: block.repeat,
    date: block.date,
    activeFrom: block.repeat.kind === 'once' ? null : today,
    activeTo: null,
  }

  return tasks
    .filter((other) => {
      if (other.startTime === null) return false
      const otherStart = timeToMinutes(other.startTime)
      if (!(start < otherStart + other.plannedMinutes && otherStart < end)) return false
      return shareADay(candidate, other, today)
    })
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title))
}

type Schedule = Pick<Task, 'startTime' | 'repeat' | 'date' | 'activeFrom' | 'activeTo'>

function shareADay(a: Schedule, b: Schedule, today: DateKey): boolean {
  // A one-off has exactly one day to check. Two repeating tasks follow a weekly pattern,
  // so looking at seven days in a row from where both are active is enough.
  let days: DateKey[]
  if (a.repeat.kind === 'once') {
    days = a.date ? [a.date] : []
  } else if (b.repeat.kind === 'once') {
    days = b.date ? [b.date] : []
  } else {
    const first = [today, a.activeFrom, b.activeFrom].filter((d): d is DateKey => d !== null).sort().at(-1) ?? today
    days = Array.from({ length: 7 }, (_, i) => addDays(first, i))
  }
  return days.some((day) => occursOn(a, day) && occursOn(b, day))
}

/** "Overlaps Deep work", "Overlaps Deep work and Email", "Overlaps Deep work and 2 more". */
export function overlapMessage(overlaps: readonly Task[]): string | null {
  const [first, second] = overlaps
  if (!first) return null
  if (!second) return `Overlaps ${first.title}`
  if (overlaps.length === 2) return `Overlaps ${first.title} and ${second.title}`
  return `Overlaps ${first.title} and ${overlaps.length - 1} more`
}
