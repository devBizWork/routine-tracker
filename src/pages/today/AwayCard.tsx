import { format } from 'date-fns'
import { categoryColor, formatClock, parseDateKey, timeToMinutes, type Occurrence, type TimeFormat } from '../../data'
import { absenceLabel, type Absence } from '../review/flow'

// "While you were away" (design/screens/WelcomeBack.html): the blocks that passed while the app was
// closed or in the background and still have nothing logged. It stays until dismissed, until all of
// them are logged, or until they are all more than a week old. At most 10 are listed (the most
// recent); the rest are counted. The sounds banner from the same design waits for Step 11.

export function AwayCard({
  absences,
  shown,
  more,
  today,
  timeFormat,
  onLogNow,
  onDismiss,
}: {
  absences: readonly Absence[]
  /** The blocks listed (the most recent ones), in time order. */
  shown: readonly Occurrence[]
  /** How many older ones are not listed. */
  more: number
  today: string
  timeFormat: TimeFormat
  /** Opens Review for all of them. */
  onLogNow: () => void
  onDismiss: () => void
}) {
  const total = shown.length + more

  return (
    <section
      aria-labelledby="away-h"
      className="mx-4 mt-3 flex shrink-0 flex-col gap-1 rounded-24 border border-line bg-card p-4 shadow-away"
    >
      <div className="flex items-center gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-primary"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
        <h2 id="away-h" className="m-0 flex-1 font-sans text-15 font-extrabold">
          While you were away
        </h2>
        <span className="text-12 font-semibold text-muted">{absenceLabel(absences, timeFormat)}</span>
      </div>
      <p className="m-0 mb-1.5 text-12-5 font-medium text-muted">
        {total === 1 ? 'This block passed and is not logged yet.' : 'These blocks passed and are not logged yet.'}
      </p>

      <ul className="m-0 flex list-none flex-col p-0">
        {shown.map((o) => {
          const time = formatClock(timeToMinutes(o.plannedStart), timeFormat)
          return (
            <li key={o.id} className="flex min-h-[34px] items-center gap-2.5 border-t border-line text-13-5 first:border-t-0">
              <span className="w-[74px] shrink-0 font-bold whitespace-nowrap text-muted">
                {o.date === today ? time : `${format(parseDateKey(o.date), 'EEE')} ${time}`}
              </span>
              <span
                aria-hidden="true"
                className="box-border size-2 shrink-0 rounded-4 border border-line-strong"
                style={{ background: categoryColor(o.color) }}
              />
              <span className="min-w-0 flex-1 truncate font-bold">{o.title}</span>
              <span className="rounded-9 border border-dashed border-unknown-edge px-2 py-0.5 text-11 font-bold text-muted">
                Unknown
              </span>
            </li>
          )
        })}
      </ul>
      {more > 0 && <p className="m-0 mt-1 text-12-5 font-semibold text-muted">+ {more} more</p>}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onLogNow}
          className="h-11 flex-1 rounded-22 border-0 bg-primary text-14 font-bold text-on-primary"
        >
          Log {total === 1 ? 'this 1' : `these ${total}`} now
        </button>
        <button type="button" onClick={onDismiss} className="h-11 rounded-22 border-0 bg-line px-[18px] text-14 font-bold text-ink">
          Dismiss
        </button>
      </div>
    </section>
  )
}
