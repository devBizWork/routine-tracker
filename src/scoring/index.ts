// The scoring rules, with no screens and no database. Import from here:
//   import { scoreDay, taskScore } from '../scoring'
export { loggedLength, overlapMinutes, scoreTask, taskScore, type ScoringBlock, type TaskScore } from './taskScore'
export {
  scoreDay,
  startedByFor,
  toPercent,
  wholePercents,
  type BlockState,
  type DayScore,
  type DayScoreOptions,
  type DayStatus,
  type ScoredBlock,
} from './dayScore'
