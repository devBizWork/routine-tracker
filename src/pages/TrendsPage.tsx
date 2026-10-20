import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useNow } from '../app/useNow'
import { listTasks, peekRange, toDateKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { firstDataDate, type CalendarData } from './calendar/month'
import { CoverageChart, MostSkipped, ScoresChart } from './trends/Charts'
import {
  currentPeriod,
  isCurrentPeriod,
  MIN_TREND_DAYS,
  mostSkipped,
  shiftPeriod,
  summarize,
  trendDays,
  type Period,
  type PeriodKind,
} from './trends/trends'

// The Trends screen (design/screens/Trends.html) at #/trends, opened from the Calendar: a week or
// a month of Day scores, how much of each day was logged, and the tasks skipped most.

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

function StatCard({ label, value, note, strong = false }: { label: string; value: string; note: string; strong?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-0.5 rounded-18 px-3.5 py-3 ${
        strong ? 'bg-primary text-on-primary' : 'border border-line bg-card text-ink'
      }`}
    >
      <span className={`text-11-5 font-bold ${strong ? 'text-pill' : 'text-muted'}`}>{label}</span>
      <span className="font-display text-28 leading-[1.15] font-bold">{value}</span>
      <span className={`text-11-5 font-semibold ${strong ? 'text-pill' : 'text-muted'}`}>{note}</span>
    </div>
  )
}

export function TrendsPage() {
  const now = useNow(60_000)
  const today = toDateKey(now)
  const [period, setPeriod] = useState<Period>(() => currentPeriod('week', today))
  const monthly = period.kind === 'month'
  const current = isCurrentPeriod(period, today)

  const { from, to } = period
  const tasks = useLiveQuery(listTasks)
  const range = useLiveQuery(useCallback(() => peekRange(from, to), [from, to]))

  const data: CalendarData | null =
    tasks && range
      ? {
          today,
          nowMinutes: now.getHours() * 60 + now.getMinutes(),
          created: new Set(range.created),
          occurrences: range.occurrences,
          tasks,
          firstDataDate: firstDataDate(range.firstDay, tasks),
        }
      : null
  const days = data ? trendDays(period, data) : []
  const summary = summarize(days)
  const skipped = mostSkipped(days)

  const choose = (kind: PeriodKind) => {
    if (kind !== period.kind) setPeriod(currentPeriod(kind, today))
  }
  const unit = monthly ? 'month' : 'week'

  return (
    <div className="flex min-h-full flex-col pb-6 tabular-nums">
      <div className="flex items-center pr-3 pl-2" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <Link to="/calendar" className="flex h-11 items-center gap-0.5 pr-3 pl-1 text-15 font-bold text-primary no-underline">
          <svg {...iconProps} width="22" height="22" strokeWidth="2.2">
            <path d="M14.5 6l-6 6 6 6" />
          </svg>
          Calendar
        </Link>
      </div>
      <h1 className="m-0 mx-5 mt-1 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">Trends</h1>

      <div role="group" aria-label="Period" className="mx-4 mt-3.5 grid grid-cols-2 gap-0.5 rounded-16 bg-line p-[3px]">
        {(['week', 'month'] as const).map((kind) => {
          const on = period.kind === kind
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={on}
              onClick={() => choose(kind)}
              className={`h-11 rounded-13 border-0 p-0 text-14 ${on ? 'bg-primary font-bold text-on-primary' : 'bg-transparent font-semibold text-ink'}`}
            >
              {kind === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          )
        })}
      </div>

      <div className="mt-2 mr-3 ml-5 flex items-center justify-between">
        <h2 className="m-0 font-sans text-16 font-bold">{period.title}</h2>
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label={`Previous ${unit}`}
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            className="flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink"
          >
            <svg {...iconProps} width="20" height="20" strokeWidth="2">
              <path d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Next ${unit}`}
            disabled={current}
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            className="flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink disabled:text-unknown-edge"
          >
            <svg {...iconProps} width="20" height="20" strokeWidth="2">
              <path d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {data && summary.loggedDays < MIN_TREND_DAYS ? (
        <p className="m-0 mx-4 mt-3 rounded-24 border border-line bg-card px-5 py-6 text-center text-15 font-semibold text-muted">
          Log a few days to see trends here.
        </p>
      ) : (
        data && (
          <div className="mx-4 mt-1.5 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard strong label="Day score" value={summary.avgFollowed === null ? '–' : `${summary.avgFollowed}%`} note="avg followed" />
              <StatCard label="Missed" value={summary.avgMissed === null ? '–' : `${summary.avgMissed}%`} note="avg missed" />
              <StatCard label="Coverage" value={`${summary.coverage}%`} note="of plan logged" />
            </div>
            <ScoresChart days={days} monthly={monthly} />
            <CoverageChart days={days} monthly={monthly} />
            <MostSkipped tasks={skipped} />
          </div>
        )
      )}
    </div>
  )
}
