import {
  actualMinutes,
  dateOfMoment,
  deviation,
  timeToMinutes,
  type Occurrence,
  type Tolerances,
} from '../../data'
import { PX_PER_MINUTE, yAt, type TimeRange } from './plan'

// The thin bar left of a block is the time you actually logged (design/screens/States.html).
// It is pool blue when the log matches the plan and apricot when it drifted; a running timer
// draws a bar from its start to now.

/** A bar never gets thinner than this, so a one-minute log can still be seen. */
const MIN_BAR = 4
/** Like a block, a bar starts 1 px below its time and ends 1 px short of it. */
const INSET = 1

export interface ActualBar {
  id: string
  top: number
  height: number
  /** The log drifted from the plan (apricot instead of blue). */
  offPlan: boolean
  /** Still growing: the timer is running, so the bottom edge is square. */
  running: boolean
}

/** The minutes after midnight a block's log covers (a running timer ends at now), or null. */
export function actualSpan(o: Occurrence, nowMs: number): { start: number; end: number } | null {
  if (o.timerStartedAt !== null) {
    const started = new Date(o.timerStartedAt)
    // A timer from an earlier day starts at the top of this one.
    const start = dateOfMoment(o.timerStartedAt) < o.date ? 0 : started.getHours() * 60 + started.getMinutes()
    const now = new Date(nowMs)
    const end = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
    return end > start ? { start, end } : null
  }
  if (actualMinutes(o) === null || o.actualStart === null || o.actualEnd === null) return null
  return { start: timeToMinutes(o.actualStart), end: timeToMinutes(o.actualEnd) }
}

export function actualBars(
  occurrences: readonly Occurrence[],
  nowMs: number,
  range: TimeRange,
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>,
): ActualBar[] {
  const bars: ActualBar[] = []
  for (const o of occurrences) {
    if (o.status === 'skipped') continue
    const span = actualSpan(o, nowMs)
    if (!span) continue
    const running = o.timerStartedAt !== null
    bars.push({
      id: o.id,
      top: yAt(span.start, range) + INSET,
      height: Math.max(MIN_BAR, (span.end - span.start) * PX_PER_MINUTE - 2 * INSET),
      offPlan: !running && deviation(o, tolerances).kind !== 'none',
      running,
    })
  }
  return bars
}
