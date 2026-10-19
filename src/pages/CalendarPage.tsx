import { format } from 'date-fns'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { useNow } from '../app/useNow'
import { listTasks, parseDateKey, peekRange, toDateKey, type DateKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { headlinePercent } from '../scoring'
import {
  dayInfo,
  firstDataDate,
  gridRange,
  inMonth,
  monthGrid,
  monthTitle,
  plannedLine,
  rememberCalendar,
  rememberedCalendar,
  shiftMonth,
  type CalendarData,
  type DayInfo,
  type MonthRef,
} from './calendar/month'
import { dayPath, reviewPath, reviewState } from './review/nav'
import { DayBar, ScoreRing } from './review/ScoreRing'

// The Calendar tab (design/screens/Calendar.html): a month, Monday first, today marked, a small
// Day score ring on each day that has one, and the selected day's summary underneath.

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

/** The day's ring percentages, or null when there is no ring to draw. */
function ringOf(info: DayInfo): { followed: number; missed: number } | null {
  if (info.kind !== 'scored' || info.score.status === 'empty') return null
  return { followed: info.score.percents.followed, missed: info.score.percents.missed }
}

function DayCell({
  date,
  info,
  today,
  selected,
  outside,
  onSelect,
}: {
  date: DateKey
  info: DayInfo
  today: DateKey
  selected: boolean
  outside: boolean
  onSelect: () => void
}) {
  const ring = ringOf(info)
  const isToday = date === today
  const number = parseDateKey(date).getDate()
  const percent = info.kind === 'scored' ? headlinePercent(info.score) : null
  const label = [
    `${isToday ? 'Today, ' : ''}${format(parseDateKey(date), 'EEEE, MMMM d')}${selected ? ', selected' : ''}`,
    percent !== null ? `Day score${isToday ? ' so far' : ''} ${percent} percent` : '',
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`relative flex items-center justify-center rounded-14 border-0 p-0 text-14 ${
        outside ? 'text-muted' : 'text-ink'
      } ${isToday || selected ? 'font-extrabold' : 'font-semibold'} ${selected ? 'bg-pill ring-2 ring-ink ring-inset' : 'bg-transparent'}`}
    >
      {ring && (
        <span className="absolute inset-0 flex items-center justify-center">
          <ScoreRing followed={ring.followed} missed={ring.missed} size={40} stroke={3} />
        </span>
      )}
      <span
        className={`relative flex size-7 items-center justify-center rounded-full ${
          isToday ? (selected ? 'bg-card text-primary' : 'bg-pill text-primary') : ''
        }`}
      >
        {number}
      </span>
    </button>
  )
}

function DaySummary({
  date,
  info,
  today,
  onOpenTimeline,
  onReview,
}: {
  date: DateKey
  info: DayInfo
  today: DateKey
  onOpenTimeline: () => void
  onReview: () => void
}) {
  if (info.kind === 'none') return null
  const heading = format(parseDateKey(date), 'EEEE, MMM d')

  const buttons = (review: boolean) => (
    <div className={`grid gap-2.5 ${review ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <button
        type="button"
        onClick={onOpenTimeline}
        className="h-12 rounded-24 border-0 bg-primary text-14 font-bold text-on-primary"
      >
        Open timeline
      </button>
      {review && (
        <button type="button" onClick={onReview} className="h-12 rounded-24 border-0 bg-line text-14 font-bold text-ink">
          Review day
        </button>
      )}
    </div>
  )

  if (info.kind === 'future') {
    return (
      <section aria-label={heading} className="mx-4 mt-3.5 flex flex-col gap-3.5 rounded-24 border border-line bg-card p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 font-sans text-17 font-bold">{heading}</h2>
          <span className="text-13 font-medium text-muted">{info.blocks === 0 ? 'Nothing planned' : 'Planned'}</span>
        </div>
        <p className="m-0 text-15 font-semibold">
          {info.blocks === 0
            ? 'No blocks planned for this day yet.'
            : `${info.blocks} ${info.blocks === 1 ? 'block' : 'blocks'} planned · ${info.minutes} min`}
        </p>
        {buttons(false)}
      </section>
    )
  }

  const { score } = info
  const percent = headlinePercent(score)
  const none = score.status === 'nothing-logged'
  return (
    <section aria-label={heading} className="mx-4 mt-3.5 flex flex-col gap-3.5 rounded-24 border border-line bg-card p-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-sans text-17 font-bold">{heading}</h2>
        <span className="text-13 font-medium text-muted">{plannedLine(info.blocks, info.minutes)}</span>
      </div>

      {score.status === 'empty' ? (
        <p className="m-0 text-14 font-medium text-muted">
          {info.blocks === 0 ? 'Nothing was planned for this day.' : 'No block has started yet.'}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-30 leading-none font-bold">{percent === null ? '–' : `${percent}%`}</span>
              <span className="text-13 font-semibold text-muted">
                {date === today ? 'Day score so far' : 'Day score'}
                {none ? ' · nothing logged yet' : ''}
              </span>
            </div>
            <DayBar followed={score.percents.followed} missed={score.percents.missed} unknown={score.percents.unknown} />
            <span className="text-12 font-semibold text-muted">
              {score.percents.followed}% followed · {score.percents.missed}% missed · {score.percents.unknown}% unknown
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-line pt-3 text-13">
            <span className="font-semibold text-muted">Logged</span>
            <span className="font-bold">
              {score.loggedMinutes} of {score.plannedMinutes} min
            </span>
          </div>
        </>
      )}
      {buttons(score.status !== 'empty' || info.blocks > 0)}
    </section>
  )
}

export function CalendarPage() {
  const navigate = useNavigate()
  const now = useNow(60_000)
  const today = toDateKey(now)

  const [view, setView] = useState(() => rememberedCalendar(today))
  const { month, selected } = view
  // Changing month selects today if it is in that month, otherwise the 1st.
  const showMonth = (next: MonthRef) =>
    show({ month: next, selected: inMonth(today, next) ? today : toDateKey(new Date(next.year, next.month, 1)) })
  const show = (next: { month: MonthRef; selected: DateKey }) => {
    setView(next)
    rememberCalendar(next.month, next.selected)
  }

  const [soon, setSoon] = useState(0)

  const weeks = monthGrid(month)
  const { from, to } = gridRange(month)
  const tasks = useLiveQuery(listTasks)
  const range = useLiveQuery(useCallback(() => peekRange(from, to), [from, to]))
  const ready = tasks !== undefined && range !== undefined

  const data: CalendarData | null = ready
    ? {
        today,
        nowMinutes: now.getHours() * 60 + now.getMinutes(),
        created: new Set(range.created),
        occurrences: range.occurrences,
        tasks,
        firstDataDate: firstDataDate(range.firstDay, tasks),
      }
    : null

  const openTimeline = () => navigate(selected === today ? '/' : dayPath(selected))
  const openReview = () => navigate(reviewPath(selected), { state: reviewState('calendar') })

  return (
    <div className="flex min-h-full flex-col pb-6 tabular-nums">
      <header
        className="flex items-center justify-between gap-3 px-5"
        style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}
      >
        <h1 className="m-0 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">Calendar</h1>
        <button
          type="button"
          aria-label="Trends"
          onClick={() => setSoon((n) => n + 1)}
          className="box-border flex h-11 items-center gap-1.5 rounded-22 border border-line bg-card pr-4 pl-3 text-13 font-bold text-primary"
        >
          <svg {...iconProps} width="18" height="18" strokeWidth="2">
            <path d="M4 17l5-5 4 4 7-8" />
            <path d="M15 8h5v5" />
          </svg>
          Trends
        </button>
      </header>

      <div className="mt-3.5 mr-3 ml-5 flex items-center justify-between">
        <h2 className="m-0 font-display text-22 font-bold">{monthTitle(month)}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => showMonth(shiftMonth(month, -1))}
            className="flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink"
          >
            <svg {...iconProps} width="22" height="22" strokeWidth="2.2">
              <path d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => showMonth(shiftMonth(month, 1))}
            className="flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink"
          >
            <svg {...iconProps} width="22" height="22" strokeWidth="2.2">
              <path d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div aria-hidden="true" className="mx-3 mt-2.5 grid grid-cols-7 text-center text-12 font-bold text-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div role="group" aria-label={monthTitle(month)} className="mx-3 mt-1 grid grid-cols-7 auto-rows-[50px]">
        {weeks.flat().map((date) => (
          <DayCell
            key={date}
            date={date}
            info={data ? dayInfo(date, data) : { kind: 'none' }}
            today={today}
            selected={date === selected}
            outside={!inMonth(date, month)}
            onSelect={() =>
              show({ month: inMonth(date, month) ? month : { year: parseDateKey(date).getFullYear(), month: parseDateKey(date).getMonth() }, selected: date })
            }
          />
        ))}
      </div>

      <div aria-hidden="true" className="mx-5 mt-2 flex gap-4 text-12 font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-5 bg-followed" />
          Followed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-5 bg-missed" />
          Missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-5 bg-unknown-ring" />
          Unknown
        </span>
      </div>

      {data && (
        <DaySummary
          date={selected}
          info={dayInfo(selected, data)}
          today={today}
          onOpenTimeline={openTimeline}
          onReview={openReview}
        />
      )}

      <ComingSoonToast tap={soon} onDone={() => setSoon(0)} />
    </div>
  )
}
