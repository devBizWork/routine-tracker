import { format } from 'date-fns'
import { Link } from 'react-router'
import type { Occurrence } from '../../data'
import { toPercent, type DayScore } from '../../scoring'
import { reviewPath, reviewState } from '../review/nav'

const soundIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
    <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
  </svg>
)

/**
 * The Day score chip (design/screens/Main.html): a small ring and the score so far. The ring shows
 * Followed in blue and Missed in apricot; whatever is left is Unknown. Tapping it opens the Day
 * review. It shows a dash until something is logged (a block that has not started does not count).
 */
function DayScoreChip({ score, date }: { score: DayScore<Occurrence>; date: string }) {
  const none = score.status === 'empty' || score.status === 'nothing-logged'
  const number = none ? null : score.status === 'complete' && score.logged !== null ? toPercent(score.logged) : score.percents.followed
  const label = none
    ? 'Day score: nothing logged yet. Open day review'
    : `Day score${score.status === 'partial' ? ' so far' : ''} ${number} percent. Open day review`

  return (
    <Link
      to={reviewPath(date)}
      state={reviewState('today')}
      aria-label={label}
      className="box-border flex h-11 items-center gap-2 rounded-22 border border-line bg-card pr-3.5 pl-2 text-ink no-underline"
    >
      <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-line)" strokeWidth="5" />
        {!none && score.percents.followed > 0 && (
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="var(--color-followed)"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray={`${score.percents.followed} 100`}
            transform="rotate(-90 18 18)"
          />
        )}
        {!none && score.percents.missed > 0 && (
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="var(--color-missed)"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray={`${score.percents.missed} 100`}
            strokeDashoffset={-score.percents.followed}
            transform="rotate(-90 18 18)"
          />
        )}
      </svg>
      <span className="flex flex-col leading-[1.1]">
        <span className="text-10 font-extrabold tracking-[0.06em] text-muted">DAY</span>
        <span className="text-15 font-bold">{number === null ? '–' : `${number}%`}</span>
      </span>
    </Link>
  )
}

/**
 * The top of the Today screen (design/screens/Main.html, FirstRun.html): the full date, the
 * title, the Day score chip and the sound button. The sound button is wired in Step 11 and says
 * "Coming soon" when tapped.
 */
export function TodayHeader({
  now,
  date,
  score,
  onComingSoon,
}: {
  now: Date
  /** The day being shown, "YYYY-MM-DD", which the Day score chip opens the review of. */
  date: string
  score: DayScore<Occurrence>
  onComingSoon: () => void
}) {
  return (
    <header
      className="flex shrink-0 items-end justify-between gap-3 px-5"
      style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 text-14 font-semibold text-muted">{format(now, 'EEEE, MMMM d')}</p>
        <h1 className="m-0 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">Today</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DayScoreChip score={score} date={date} />

        <button
          type="button"
          aria-label="Mute sounds"
          aria-pressed="false"
          onClick={onComingSoon}
          className="box-border flex size-11 items-center justify-center rounded-22 border border-line bg-card p-0 text-primary"
        >
          {soundIcon}
        </button>
      </div>
    </header>
  )
}
