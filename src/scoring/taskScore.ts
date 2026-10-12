import { timeToMinutes } from '../data/time'
import type { OccurrenceStatus, TimeOfDay } from '../data/types'

// The score of one block (docs/feature-spec.md, "Per-task score"). Pure functions: numbers in,
// numbers out, nothing about screens or the database.
//
// A block's score is how much of its planned time you actually spent inside it, at the time it
// was planned:
//
//   Task score = (minutes the actual time overlaps the planned time) / (planned minutes)
//
// Done exactly as planned is 100%. Started late, stopped early or done at another time scores only
// the part that matched the plan. A skipped block scores 0. Running longer than planned is not
// punished here (the block shows a "+15 min" tag instead), because you still did all the planned time.

/** What the scoring needs to know about a block. An Occurrence fits this. */
export interface ScoringBlock {
  plannedStart: TimeOfDay
  plannedMinutes: number
  status: OccurrenceStatus
  actualStart: TimeOfDay | null
  actualEnd: TimeOfDay | null
  /** A running timer: the block is in progress, not logged yet. */
  timerStartedAt?: number | null
}

export interface TaskScore {
  /** 0 to 1: the share of the planned time that was spent on plan. */
  score: number
  /** The minutes of the actual time that fall inside the planned time. */
  matchedMinutes: number
}

/** The minutes between the actual start and end, or null if either is missing or not in order. */
export function loggedLength(block: Pick<ScoringBlock, 'actualStart' | 'actualEnd'>): number | null {
  if (block.actualStart === null || block.actualEnd === null) return null
  const minutes = timeToMinutes(block.actualEnd) - timeToMinutes(block.actualStart)
  return minutes > 0 ? minutes : null
}

/** How many minutes of two time spans (minutes after midnight) are the same minutes. */
export function overlapMinutes(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB))
}

/**
 * The score of one block, or null if it has no score yet (it was not logged, so it is Unknown).
 * A skipped block scores 0; a done block needs a valid start and end.
 */
export function scoreTask(block: ScoringBlock): TaskScore | null {
  if (block.status === 'skipped') return { score: 0, matchedMinutes: 0 }
  if (block.status !== 'done') return null
  if (loggedLength(block) === null || block.actualStart === null || block.actualEnd === null) return null
  if (block.plannedMinutes <= 0) return null

  const plannedStart = timeToMinutes(block.plannedStart)
  const matchedMinutes = overlapMinutes(
    plannedStart,
    plannedStart + block.plannedMinutes,
    timeToMinutes(block.actualStart),
    timeToMinutes(block.actualEnd),
  )
  return { score: Math.min(1, matchedMinutes / block.plannedMinutes), matchedMinutes }
}

/** Just the number from scoreTask. */
export function taskScore(block: ScoringBlock): number | null {
  return scoreTask(block)?.score ?? null
}
