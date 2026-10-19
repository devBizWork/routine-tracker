import { isDateKey } from '../../data'

// Where the Day review lives and where its back link goes. The Today screen (and, later, the
// Calendar) opens it with a note of where it came from; opened any other way, back is Today.

export type ReviewOrigin = 'today' | 'calendar'

/** The address of a day's review: #/day/2026-10-05/review */
export function reviewPath(date: string): string {
  return `/day/${date}/review`
}

/** The address of a day's timeline: #/day/2026-10-05 */
export function dayPath(date: string): string {
  return `/day/${date}`
}

/** What to pass as `state` when opening the review, so Back knows where to go. */
export function reviewState(from: ReviewOrigin): { from: ReviewOrigin } {
  return { from }
}

export function backTarget(state: unknown): { to: string; label: string } {
  const from = typeof state === 'object' && state !== null && 'from' in state ? (state as { from: unknown }).from : null
  return from === 'calendar' ? { to: '/calendar', label: 'Calendar' } : { to: '/', label: 'Today' }
}

/** True if the address holds a real day. */
export function isReviewDate(date: string | undefined): date is string {
  return isDateKey(date)
}
