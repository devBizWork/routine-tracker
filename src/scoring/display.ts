import type { DayScore } from './dayScore'
import { toPercent } from './dayScore'
import type { ScoringBlock } from './taskScore'

/**
 * The one number to show for a day (the Today chip, the review's big number, "All caught up"):
 * the Logged score on a fully logged day, Followed on a part-logged day, and null ("–") when
 * nothing is logged or nothing counts yet.
 */
export function headlinePercent<T extends ScoringBlock>(score: DayScore<T>): number | null {
  if (score.status === 'empty' || score.status === 'nothing-logged') return null
  if (score.status === 'complete' && score.logged !== null) return toPercent(score.logged)
  return score.percents.followed
}
