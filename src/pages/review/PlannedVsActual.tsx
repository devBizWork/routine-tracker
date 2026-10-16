import { categoryColor } from '../../data'
import type { ReviewRow } from './rows'

// The "Planned vs actual" list on the Day review (design/screens/DayReview.html): for each block,
// its score, the plan and the actual times in words, and two thin bars on a shared time scale.
// The bars use the same two colours on every row, as the legend says: every plan bar is navy and
// every actual bar is green (time done). A block with no actual time (skipped, or not logged) has no actual bar at
// all; its words and score pill say why.

function ScorePill({ row }: { row: ReviewRow }) {
  if (row.score === null) {
    return (
      <span className="rounded-10 border-[1.5px] border-dashed border-unknown-edge px-[9px] py-0.5 text-12-5 font-extrabold text-muted">
        {row.running ? 'In progress' : 'Unknown'}
      </span>
    )
  }
  const percent = Math.round(row.score * 100)
  const style =
    row.score >= 0.995
      ? 'bg-primary text-on-primary'
      : row.score <= 0.005
        ? 'bg-missed-soft text-missed-text'
        : 'bg-line text-ink'
  return <span className={`rounded-10 px-2.5 py-[3px] text-12-5 font-extrabold ${style}`}>{percent}%</span>
}

function Row({ row }: { row: ReviewRow }) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-line px-4 py-3.5 first:border-t-0">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="box-border size-2.5 shrink-0 rounded-5 border border-line-strong"
          style={{ background: categoryColor(row.color) }}
        />
        <span className="min-w-0 flex-1 text-15 font-bold break-words">{row.title}</span>
        <ScorePill row={row} />
      </div>
      <span className="text-12-5 font-medium text-muted">
        {row.planText} · {row.actualText}
      </span>
      <div aria-hidden="true" className="relative mt-0.5 h-[19px]">
        <span
          data-bar="plan"
          className="absolute top-0 h-2 rounded-4 bg-plan-bar"
          style={{ left: `${row.planBar.left}%`, width: `${row.planBar.width}%` }}
        />
        {row.actualBar ? (
          <span
            data-bar="actual"
            className="absolute top-[11px] h-2 rounded-4 bg-actual-bar"
            style={{ left: `${row.actualBar.left}%`, width: `${row.actualBar.width}%` }}
          />
        ) : null}
      </div>
      {row.drift && (
        <span className="self-start rounded-8 bg-missed-soft px-2 py-0.5 text-11-5 font-bold text-missed-text">
          {row.drift}
        </span>
      )}
    </li>
  )
}

export function PlannedVsActual({ rows }: { rows: readonly ReviewRow[] }) {
  return (
    <section aria-labelledby="tasks-h" className="mx-4 mt-5 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 id="tasks-h" className="m-0 font-sans text-12 font-extrabold tracking-[0.07em] text-muted">
          PLANNED VS ACTUAL
        </h2>
        <span aria-hidden="true" className="flex gap-2.5 text-11 font-semibold text-muted">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-3 bg-plan-bar" />
            Plan
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-3 bg-actual-bar" />
            Actual
          </span>
        </span>
      </div>
      <p className="m-0 px-1 text-12-5 font-medium text-muted">
        Each percentage is how much of the planned time you spent on plan, at the time it was planned.
      </p>
      <ul className="m-0 list-none overflow-hidden rounded-22 border border-line bg-card p-0">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>
    </section>
  )
}
