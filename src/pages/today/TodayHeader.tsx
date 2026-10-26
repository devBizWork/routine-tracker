import { format } from 'date-fns'
import { Link } from 'react-router'
import type { Occurrence } from '../../data'
import { headlinePercent, type DayScore } from '../../scoring'
import { reviewPath, reviewState } from '../review/nav'
import { ScoreRing } from '../review/ScoreRing'
import { SoundButton, type SoundButtonState } from './SoundControls'


/**
 * The Day score chip (design/screens/Main.html): a small ring and the score so far. The ring shows
 * Followed in blue and Missed in apricot; whatever is left is Unknown. Tapping it opens the Day
 * review. It shows a dash until something is logged (a block that has not started does not count).
 */
function DayScoreChip({ score, date }: { score: DayScore<Occurrence>; date: string }) {
  const none = score.status === 'empty' || score.status === 'nothing-logged'
  const number = headlinePercent(score)
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
      <ScoreRing followed={none ? 0 : score.percents.followed} missed={none ? 0 : score.percents.missed} />
      <span className="flex flex-col leading-[1.1]">
        <span className="text-10 font-extrabold tracking-[0.06em] text-muted">DAY</span>
        <span className="text-15 font-bold">{number === null ? '–' : `${number}%`}</span>
      </span>
    </Link>
  )
}

/**
 * The top of the Today screen (design/screens/Main.html, FirstRun.html): the full date, the
 * title, the Day score chip and the sound button (on, muted, or waiting for a tap).
 */
export function TodayHeader({
  now,
  date,
  score,
  sound,
  onSoundTap,
}: {
  now: Date
  /** The day being shown, "YYYY-MM-DD", which the Day score chip opens the review of. */
  date: string
  score: DayScore<Occurrence>
  sound: SoundButtonState
  onSoundTap: () => void
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

        <SoundButton state={sound} onTap={onSoundTap} />
      </div>
    </header>
  )
}
