import { categoryColor } from '../../data'
import type { ReviewRow } from './rows'

// The "Planned vs actual" list on the Day review (design/screens/DayReview.html): for each block,
// its score, the plan and the actual times in words, and two thin bars on a shared time scale.

const STRIPES = 'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'

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
  const offPlan = row.drift !== null
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
      <div aria-hidden="true" className="relative mt-0.5 h-4">
        <span
          className="absolute top-0 h-1.5 rounded-3"
          style={{
            left: `${row.planBar.left}%`,
            width: `${row.planBar.width}%`,
            background: categoryColor(row.color),
          }}
        />
        {row.actualBar ? (
          <span
            data-actual={offPlan ? 'off-plan' : 'on-plan'}
            className={`absolute top-[9px] h-1.5 rounded-3 ${offPlan ? 'bg-missed' : 'bg-primary'}`}
            style={{ left: `${row.actualBar.left}%`, width: `${row.actualBar.width}%` }}
          />
        ) : row.state === 'skipped' ? (
          <span className="absolute top-[9px] left-0 box-border h-1.5 w-full rounded-3 border-[1.5px] border-missed" />
        ) : (
          <span
            className="absolute top-[9px] left-0 h-1.5 w-full rounded-3"
            style={{ background: STRIPES }}
          />
        )}
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
            <span className="h-[5px] w-3 rounded-3 bg-line-strong" />
            Plan
          </span>
          <span className="flex items-center gap-1">
            <span className="h-[5px] w-3 rounded-3 bg-primary" />
            Actual
          </span>
        </span>
      </div>
      <ul className="m-0 list-none overflow-hidden rounded-22 border border-line bg-card p-0">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>
    </section>
  )
}
