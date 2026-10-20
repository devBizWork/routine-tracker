import { format } from 'date-fns'
import { categoryColor, parseDateKey } from '../../data'
import { coverageOf, coverageSummary, scoresSummary, skippedText, type SkippedTask, type TrendDay } from './trends'

// The Trends charts (design/screens/Trends.html), drawn by hand: plain SVG rectangles and HTML
// labels, no chart library. The bars stretch to the card's width, so they fit a 375 px screen, and
// each chart has a sentence version for VoiceOver.

const STRIPES = 'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'
const SLOT = 10

/** The labels under a chart: every day for a week, every few days for a month. */
function DayLabels({ days, monthly, inset = 0 }: { days: readonly TrendDay[]; monthly: boolean; inset?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid text-center text-11 leading-[1.35] font-semibold text-muted"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, marginLeft: inset }}
    >
      {days.map((d) => {
        const date = parseDateKey(d.date)
        const n = date.getDate()
        if (monthly) {
          const show = n === 1 || n % 5 === 0
          return (
            <span key={d.date} className={`whitespace-nowrap ${d.isToday ? 'font-extrabold text-primary' : ''}`}>
              {show || d.isToday ? n : ''}
            </span>
          )
        }
        return d.isToday ? (
          <span key={d.date} className="font-extrabold text-primary">
            Today
            <br />
            so far
          </span>
        ) : (
          <span key={d.date}>
            {format(date, 'EEEEE')}
            <br />
            {n}
          </span>
        )
      })}
    </div>
  )
}

/** Each day's Day score as a stacked bar: Followed (blue) under Missed (apricot); the rest is Unknown. */
export function ScoresChart({ days, monthly }: { days: readonly TrendDay[]; monthly: boolean }) {
  const width = days.length * SLOT
  const bar = monthly ? 6.5 : 4.5
  return (
    <section aria-labelledby="scores-h" className="flex flex-col gap-3.5 rounded-24 border border-line bg-card px-4 pt-4 pb-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="scores-h" className="m-0 font-sans text-15 font-bold">
          Scores by day
        </h2>
        <span aria-hidden="true" className="flex gap-3 text-11-5 font-semibold text-muted">
          <span className="flex items-center gap-[5px]">
            <span className="size-2.5 rounded-3 bg-followed" />
            Followed
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="size-2.5 rounded-3 bg-missed" />
            Missed
          </span>
        </span>
      </div>
      <p className="sr-only">{scoresSummary(days)}</p>
      <div aria-hidden="true" className="flex gap-1.5">
        <div className="relative h-[140px] w-[30px] text-right text-10-5 font-semibold text-muted">
          <span className="absolute right-0 -top-[7px]">100</span>
          <span className="absolute right-0 top-[63px]">50</span>
          <span className="absolute right-0 top-[133px]">0</span>
        </div>
        <div className="relative h-[140px] flex-1">
          <span className="absolute inset-x-0 top-0 h-px bg-line" />
          <span className="absolute inset-x-0 top-[70px] h-px bg-line" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} 100`} preserveAspectRatio="none">
            {days.map((d, i) => {
              if (!d.hasData || !d.score) return null
              const x = i * SLOT + (SLOT - bar) / 2
              const f = d.score.percents.followed
              const m = d.score.percents.missed
              const today = d.isToday
              return (
                <g key={d.date} opacity={today ? 0.55 : 1}>
                  {f > 0 && <rect x={x} y={100 - f} width={bar} height={f} fill="var(--color-followed)" />}
                  {m > 0 && <rect x={x} y={100 - f - m} width={bar} height={m} fill="var(--color-missed)" />}
                  {today && (
                    <rect
                      x={x}
                      y={100 - Math.max(f + m, 2)}
                      width={bar}
                      height={Math.max(f + m, 2)}
                      fill="none"
                      stroke="var(--color-ink)"
                      strokeWidth={1.5}
                      strokeDasharray="3 2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <DayLabels days={days} monthly={monthly} inset={36} />
    </section>
  )
}

/** Each day's coverage: the share of its planned minutes that is logged. */
export function CoverageChart({ days, monthly }: { days: readonly TrendDay[]; monthly: boolean }) {
  return (
    <section aria-labelledby="cov-h" className="flex flex-col gap-3 rounded-24 border border-line bg-card px-4 pt-4 pb-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="cov-h" className="m-0 font-sans text-15 font-bold">
          Logging coverage
        </h2>
        <span className="text-12-5 font-medium text-muted">Share of planned minutes you logged</span>
      </div>
      <p className="sr-only">{coverageSummary(days)}</p>
      {monthly ? (
        <>
          <svg
            aria-hidden="true"
            className="h-[90px] w-full"
            viewBox={`0 0 ${days.length * SLOT} 100`}
            preserveAspectRatio="none"
          >
            {days.map((d, i) => {
              const c = coverageOf(d)
              const x = i * SLOT + 1.5
              return (
                <g key={d.date}>
                  {d.hasData && <rect x={x} y={0} width={SLOT - 3} height={100} fill="var(--color-line)" />}
                  {c !== null && c > 0 && (
                    <rect x={x} y={100 - c} width={SLOT - 3} height={c} fill={d.isToday ? 'var(--color-primary)' : 'var(--color-ink)'} />
                  )}
                </g>
              )
            })}
          </svg>
          <DayLabels days={days} monthly />
        </>
      ) : (
        <div aria-hidden="true" className="grid items-end gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const c = coverageOf(d)
            return (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className={`text-11-5 font-extrabold ${d.isToday ? 'text-primary' : ''}`}>{c ?? '–'}</span>
                <span className="flex h-[90px] w-full items-end overflow-hidden rounded-10" style={{ background: STRIPES }}>
                  {c !== null && (
                    <span className={`w-full rounded-10 ${d.isToday ? 'bg-primary' : 'bg-ink'}`} style={{ height: `${c}%` }} />
                  )}
                </span>
                <span className={`text-11 font-bold ${d.isToday ? 'text-primary' : 'text-muted'}`}>
                  {format(parseDateKey(d.date), 'EEEEE')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function MostSkipped({ tasks }: { tasks: readonly SkippedTask[] }) {
  return (
    <section aria-labelledby="skip-h" className="flex flex-col gap-1 rounded-24 border border-line bg-card px-4 pt-4 pb-1.5">
      <h2 id="skip-h" className="m-0 mb-1 font-sans text-15 font-bold">
        Most skipped
      </h2>
      {tasks.length === 0 ? (
        <p className="m-0 pb-3 text-13 font-medium text-muted">Nothing was skipped in this period.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {tasks.map((t) => {
            const text = skippedText(t)
            return (
              <li key={t.taskId} className="flex flex-col gap-[7px] border-t border-line py-2.5 first:border-t-0">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="box-border size-2.5 shrink-0 rounded-5 border border-line-strong"
                    style={{ background: categoryColor(t.color) }}
                  />
                  <span className="min-w-0 flex-1 text-14-5 font-bold break-words">{t.title}</span>
                  <span className="text-12-5 font-semibold whitespace-nowrap text-muted">
                    Skipped <span className="font-extrabold text-missed-text">{text.skipped}</span>
                    {text.rest}
                  </span>
                </div>
                <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-3 bg-line">
                  <span className="bg-missed" style={{ width: `${(t.skipped / t.days) * 100}%` }} />
                  {t.unknown > 0 && <span style={{ width: `${(t.unknown / t.days) * 100}%`, background: STRIPES }} />}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
