import { timeToMinutes } from '../data/time'
import { scoreTask, type ScoringBlock } from './taskScore'

// The two scores of a day (docs/feature-spec.md, "The two calculations"). Tasks count by their
// planned minutes (w), so a 2-hour block matters more than a 10-minute one. A block's score s is the
// share of its planned time that was spent on plan, so w * s is simply its matched minutes.
//
//   Logged score = sum over logged (w * s) / sum over logged (w)
//   Followed     = sum over logged (w * s) / sum over all planned (w)
//   Missed       = sum over logged (w * (1 - s)) / sum over all planned (w)
//   Unknown      = sum over not logged (w) / sum over all planned (w)
//
// Followed + Missed + Unknown is always 100%. The real result lies between Followed (if every
// Unknown block was missed) and Followed + Unknown (if every one went to plan).

export type BlockState = 'done' | 'skipped' | 'unknown'

export interface ScoredBlock<T extends ScoringBlock> {
  block: T
  state: BlockState
  /** 0 to 1, or null for an Unknown block. */
  score: number | null
  /** The weight: the block's planned minutes. */
  weight: number
}

/**
 * What the screens should show:
 *   empty          no blocks count (nothing planned, or nothing has started yet)
 *   nothing-logged blocks count but none is logged: Logged score is "-", Day bar is all Unknown
 *   partial        some logged, some Unknown: both scores, with the real-result range
 *   complete       everything logged: Unknown is 0%, so one number is shown
 */
export type DayStatus = 'empty' | 'nothing-logged' | 'partial' | 'complete'

export interface DayScore<T extends ScoringBlock> {
  /** The blocks that count, in the order given. */
  items: ScoredBlock<T>[]
  status: DayStatus
  /** Planned minutes of all counted blocks. */
  plannedMinutes: number
  /** Planned minutes of the counted blocks that are logged (done or skipped). */
  loggedMinutes: number
  /** Planned minutes of the counted blocks that are not logged. */
  unknownMinutes: number
  /** Logged score, 0 to 1, or null if nothing is logged. */
  logged: number | null
  /** Followed, Missed and Unknown as fractions of the planned minutes (0 each when none count). */
  followed: number
  missed: number
  unknown: number
  /** The same three as whole percentages that add up to exactly 100 (all 0 when none count). */
  percents: { followed: number; missed: number; unknown: number }
  /** The real result, as whole percentages: Followed up to Followed + Unknown. */
  range: { low: number; high: number }
  /** How many counted blocks have no log at all (a block with a running timer is not counted here). */
  unloggedCount: number
}

export interface DayScoreOptions {
  /**
   * Only blocks planned to start at or before this many minutes after midnight count. Used for
   * today (so a block later today is not Unknown yet); leave it out for a finished day.
   */
  startedBy?: number
}

/**
 * Which blocks count on a given date: all of a past day, only those already started today, and
 * none of a future day. Returns the `startedBy` for scoreDay (undefined = all).
 */
export function startedByFor(date: string, today: string, nowMinutes: number): number | undefined {
  if (date < today) return undefined
  if (date === today) return nowMinutes
  return -1
}

/**
 * Whole percentages for fractions that add up to 1, adjusted so they add up to exactly 100
 * (the largest remainders round up). All zeros if there is nothing to split.
 */
export function wholePercents(fractions: readonly number[]): number[] {
  const total = fractions.reduce((sum, f) => sum + f, 0)
  if (total <= 0) return fractions.map(() => 0)
  const scaled = fractions.map((f) => (f / total) * 100)
  const floors = scaled.map(Math.floor)
  let left = 100 - floors.reduce((sum, n) => sum + n, 0)
  const order = scaled
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return floors
}

export function scoreDay<T extends ScoringBlock>(blocks: readonly T[], options: DayScoreOptions = {}): DayScore<T> {
  const counted = blocks.filter(
    (b) => b.plannedMinutes > 0 && (options.startedBy === undefined || timeToMinutes(b.plannedStart) <= options.startedBy),
  )

  const items: ScoredBlock<T>[] = counted.map((block) => {
    const result = scoreTask(block)
    return {
      block,
      state: result === null ? 'unknown' : block.status === 'skipped' ? 'skipped' : 'done',
      score: result?.score ?? null,
      weight: block.plannedMinutes,
    }
  })

  let plannedMinutes = 0
  let loggedMinutes = 0
  let earned = 0
  let unloggedCount = 0
  for (const item of items) {
    plannedMinutes += item.weight
    if (item.score === null) {
      if (item.block.status === 'planned' && !item.block.timerStartedAt) unloggedCount += 1
    } else {
      loggedMinutes += item.weight
      earned += item.weight * item.score
    }
  }
  const unknownMinutes = plannedMinutes - loggedMinutes

  const followed = plannedMinutes > 0 ? earned / plannedMinutes : 0
  const unknown = plannedMinutes > 0 ? unknownMinutes / plannedMinutes : 0
  const missed = plannedMinutes > 0 ? (loggedMinutes - earned) / plannedMinutes : 0
  const [pFollowed = 0, pMissed = 0, pUnknown = 0] = wholePercents([followed, missed, unknown])

  const status: DayStatus =
    plannedMinutes === 0 ? 'empty' : loggedMinutes === 0 ? 'nothing-logged' : unknownMinutes === 0 ? 'complete' : 'partial'

  return {
    items,
    status,
    plannedMinutes,
    loggedMinutes,
    unknownMinutes,
    logged: loggedMinutes > 0 ? earned / loggedMinutes : null,
    followed,
    missed,
    unknown,
    percents: { followed: pFollowed, missed: pMissed, unknown: pUnknown },
    range: { low: pFollowed, high: pFollowed + pUnknown },
    unloggedCount,
  }
}

/** A fraction as a whole percentage: 0.75 -> 75. */
export function toPercent(fraction: number): number {
  return Math.round(fraction * 100)
}
