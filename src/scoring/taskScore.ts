import { timeToMinutes } from '../data/time'
import type { OccurrenceStatus, TimeOfDay, Tolerances } from '../data/types'

// The score of one block (docs/feature-spec.md, "Per-task score"). Pure functions: numbers in,
// numbers out, nothing about screens or the database.
//
//   Task score = 0.5 + 0.25 T + 0.25 D        (a done block)
//   Task score = 0                            (a skipped block)
//
// T is the timing credit and D the duration credit, each from 0 to 1.

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

/** The Settings tolerances the scores use. */
export type ScoringTolerances = Pick<Tolerances, 'onTimeMin' | 'lengthPct' | 'zeroCreditMin'>

export interface TaskScore {
  /** 0 to 1. */
  score: number
  /** T: timing credit, 0 to 1 (0 for a skipped block). */
  timing: number
  /** D: duration credit, 0 to 1 (0 for a skipped block). */
  duration: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * T: 1 if the block started within `onTimeMin` minutes of its plan, then falling evenly to 0 at
 * `zeroCreditMin` minutes early or late (and staying 0 beyond that).
 * @param startDiffMinutes actual start minus planned start (negative = early)
 */
export function timingCredit(startDiffMinutes: number, tolerances: ScoringTolerances): number {
  const off = Math.abs(startDiffMinutes)
  if (off <= tolerances.onTimeMin) return 1
  const span = tolerances.zeroCreditMin - tolerances.onTimeMin
  if (span <= 0) return 0
  return clamp01(1 - (off - tolerances.onTimeMin) / span)
}

/**
 * D: 1 if the time actually spent is within `lengthPct` percent of the plan. Shorter, it falls
 * evenly to 0 at no time at all; longer, evenly to 0 at double the plan (and stays 0 beyond).
 */
export function durationCredit(
  actualMinutes: number,
  plannedMinutes: number,
  tolerances: Pick<ScoringTolerances, 'lengthPct'>,
): number {
  if (plannedMinutes <= 0) return 0
  const tolerance = tolerances.lengthPct / 100
  // Compared in minutes, with a hair of room, so exactly 10% over (66 of 60) is not lost to rounding.
  if (Math.abs(actualMinutes - plannedMinutes) <= plannedMinutes * tolerance + 1e-9) return 1
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 1) return clamp01(ratio / (1 - tolerance))
  // Longer than the plan: from 1 at (1 + tolerance) down to 0 at 2 times the plan.
  if (tolerance >= 1) return 0
  return clamp01((2 - ratio) / (1 - tolerance))
}

/** The minutes between the actual start and end, or null if either is missing or not in order. */
export function loggedLength(block: Pick<ScoringBlock, 'actualStart' | 'actualEnd'>): number | null {
  if (block.actualStart === null || block.actualEnd === null) return null
  const minutes = timeToMinutes(block.actualEnd) - timeToMinutes(block.actualStart)
  return minutes > 0 ? minutes : null
}

/**
 * The score of one block, or null if it has no score yet (it was not logged, so it is Unknown).
 * A skipped block scores 0; a done block needs a valid start and end.
 */
export function scoreTask(block: ScoringBlock, tolerances: ScoringTolerances): TaskScore | null {
  if (block.status === 'skipped') return { score: 0, timing: 0, duration: 0 }
  if (block.status !== 'done') return null
  const length = loggedLength(block)
  if (length === null || block.actualStart === null) return null

  const timing = timingCredit(timeToMinutes(block.actualStart) - timeToMinutes(block.plannedStart), tolerances)
  const duration = durationCredit(length, block.plannedMinutes, tolerances)
  return { score: 0.5 + 0.25 * timing + 0.25 * duration, timing, duration }
}

/** Just the number from scoreTask. */
export function taskScore(block: ScoringBlock, tolerances: ScoringTolerances): number | null {
  return scoreTask(block, tolerances)?.score ?? null
}
