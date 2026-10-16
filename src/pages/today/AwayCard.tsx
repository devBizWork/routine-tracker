import { categoryColor, formatClock, timeToMinutes, type TimeFormat } from '../../data'
import { absenceLabel, type Absence, type PassedBlock } from '../review/flow'

// "While you were away" (design/screens/WelcomeBack.html): when Today opens after the app was
// closed or in the background, the block changes that passed meanwhile, how each stands, and a
// way to log the ones left Unknown. The sounds banner from the same design waits for Step 11.

function StatusTag({ status }: { status: PassedBlock['status'] }) {
  switch (status) {
    case 'unknown':
      return (
        <span className="rounded-9 border border-dashed border-unknown-edge px-2 py-0.5 text-11 font-bold text-muted">
          Unknown
        </span>
      )
    case 'now':
      return <span className="rounded-9 bg-pill px-2 py-[3px] text-11 font-extrabold text-primary">Now</span>
    case 'running':
      return <span className="rounded-9 bg-pill px-2 py-[3px] text-11 font-extrabold text-primary">Timer on</span>
    case 'done':
      return <span className="rounded-9 bg-primary px-2 py-[3px] text-11 font-extrabold text-on-primary">Done</span>
    case 'skipped':
      return <span className="rounded-9 bg-line px-2 py-[3px] text-11 font-bold text-muted">Skipped</span>
  }
}

export function AwayCard({
  absence,
  blocks,
  timeFormat,
  onLogNow,
  onDismiss,
}: {
  absence: Absence
  blocks: readonly PassedBlock[]
  timeFormat: TimeFormat
  /** Opens Review today for the Unknown ones. */
  onLogNow: () => void
  onDismiss: () => void
}) {
  const toLog = blocks.filter((b) => b.status === 'unknown').length

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
        <span className="text-12 font-semibold text-muted">{absenceLabel(absence, timeFormat)}</span>
      </div>
      <p className="m-0 mb-1.5 text-12-5 font-medium text-muted">These block changes passed without a chime.</p>

      <ul className="m-0 flex list-none flex-col p-0">
        {blocks.map(({ occurrence: o, status }) => (
          <li key={o.id} className="flex min-h-[34px] items-center gap-2.5 border-t border-line text-13-5 first:border-t-0">
            <span className="w-11 font-bold text-muted">{formatClock(timeToMinutes(o.plannedStart), timeFormat)}</span>
            <span
              aria-hidden="true"
              className="box-border size-2 shrink-0 rounded-4 border border-line-strong"
              style={{ background: categoryColor(o.color) }}
            />
            <span className="min-w-0 flex-1 truncate font-bold">{o.title}</span>
            <StatusTag status={status} />
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex gap-2">
        {toLog > 0 && (
          <button
            type="button"
            onClick={onLogNow}
            className="h-11 flex-1 rounded-22 border-0 bg-primary text-14 font-bold text-on-primary"
          >
            Log {toLog === 1 ? 'this 1' : `these ${toLog}`} now
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className={`h-11 rounded-22 border-0 bg-line px-[18px] text-14 font-bold text-ink ${toLog > 0 ? '' : 'flex-1'}`}
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}
