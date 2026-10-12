import {
  actualMinutes,
  formatDuration,
  formatSpan,
  minutesToTime,
  plannedEndMinutes,
  timeToMinutes,
  type CategoryId,
  type Occurrence,
  type TimeFormat,
  type Tolerances,
} from '../../data'
import type { BlockState, ScoredBlock } from '../../scoring'

// What the "Planned vs actual" list on the Day review shows for each block, worked out here so
// it can be tested. The screen only draws it (design/screens/DayReview.html).

/** A bar drawn over the span from the earliest start to the latest end of the plan and the log. */
export interface BarSpan {
  /** Percent of the track from its left edge. */
  left: number
  /** Percent of the track. */
  width: number
}

export interface ReviewRow {
  id: string
  title: string
  color: CategoryId
  state: BlockState
  /** The block's timer is running, so it is in progress rather than missing. */
  running: boolean
  /** 0 to 1, or null for an Unknown block. */
  score: number | null
  /** "Plan 6:30 – 7:30 am" */
  planText: string
  /** "Actual 6:30 – 7:30 am", "Skipped" or "Not logged" */
  actualText: string
  planBar: BarSpan
  /** null when there is no actual time to draw (skipped, not logged, timer running). */
  actualBar: BarSpan | null
  /** "Started 60 min late · length on plan", or null when the block kept to the plan. */
  drift: string | null
}

/**
 * How a logged block drifted, both parts at once: "Started 60 min late · length on plan",
 * "Started on time · 15 min over". null if the start and the length are both within the
 * tolerances from Settings.
 */
export function driftSummary(
  o: Pick<Occurrence, 'plannedStart' | 'plannedMinutes' | 'actualStart' | 'actualEnd'>,
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>,
): string | null {
  const length = actualMinutes(o)
  if (o.actualStart === null || length === null) return null

  const startDiff = timeToMinutes(o.actualStart) - timeToMinutes(o.plannedStart)
  const lengthDiff = length - o.plannedMinutes
  const startOff = Math.abs(startDiff) > tolerances.onTimeMin
  const lengthOff = Math.abs(lengthDiff) > (o.plannedMinutes * tolerances.lengthPct) / 100
  if (!startOff && !lengthOff) return null

  const startPart = startOff
    ? `Started ${formatDuration(Math.abs(startDiff))} ${startDiff > 0 ? 'late' : 'early'}`
    : 'Started on time'
  const lengthPart = lengthOff
    ? `${formatDuration(Math.abs(lengthDiff))} ${lengthDiff > 0 ? 'over' : 'short'}`
    : 'length on plan'
  return `${startPart} · ${lengthPart}`
}

function bar(start: number, end: number, from: number, to: number): BarSpan {
  const total = Math.max(1, to - from)
  return { left: ((start - from) / total) * 100, width: Math.max(1.5, ((end - start) / total) * 100) }
}

export function reviewRows(
  items: readonly ScoredBlock<Occurrence>[],
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>,
  timeFormat: TimeFormat,
): ReviewRow[] {
  return items.map(({ block: o, state, score }) => {
    const planStart = timeToMinutes(o.plannedStart)
    const planEnd = plannedEndMinutes(o)
    const planText = `Plan ${formatSpan(o.plannedStart, minutesToTime(planEnd), timeFormat)}`
    const running = o.timerStartedAt !== null

    if (state === 'done' && o.actualStart !== null && o.actualEnd !== null) {
      const actStart = timeToMinutes(o.actualStart)
      const actEnd = timeToMinutes(o.actualEnd)
      const from = Math.min(planStart, actStart)
      const to = Math.max(planEnd, actEnd)
      return {
        id: o.id,
        title: o.title,
        color: o.color,
        state,
        running,
        score,
        planText,
        actualText: `Actual ${formatSpan(o.actualStart, o.actualEnd, timeFormat)}`,
        planBar: bar(planStart, planEnd, from, to),
        actualBar: bar(actStart, actEnd, from, to),
        drift: driftSummary(o, tolerances),
      }
    }

    return {
      id: o.id,
      title: o.title,
      color: o.color,
      state,
      running,
      score,
      planText,
      actualText: state === 'skipped' ? 'Skipped' : running ? 'Timer running' : 'Not logged',
      planBar: { left: 0, width: 100 },
      actualBar: null,
      drift: null,
    }
  })
}
