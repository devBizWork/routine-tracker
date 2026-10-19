import { format } from 'date-fns'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { useNow } from '../app/useNow'
import {
  defaultSettings,
  getDay,
  getTask,
  hasEnded,
  isDateKey,
  isUnlogged,
  listTasks,
  parseDateKey,
  peekDay,
  peekRange,
  readSettings,
  toDateKey,
  type DateKey,
  type Occurrence,
} from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { headlinePercent, scoreDay, startedByFor } from '../scoring'
import { dayInfo, firstDataDate, plannedLine, weekOf, weekRange, type CalendarData } from './calendar/month'
import { LogSheet } from './log/LogSheet'
import { dayPath, reviewPath, reviewState } from './review/nav'
import { DayBar, ScoreRing } from './review/ScoreRing'
import { TaskSheet, type SheetMode } from './tasks/TaskSheet'
import { actualSpan } from './today/actuals'
import { spanOf, timelineHeight, visibleRange, yAt } from './today/plan'
import { Timeline } from './today/Timeline'

// The Day screen (design/screens/Day.html) at #/day/:date: any day other than today, with the
// week strip, the Day score card (opens Day review) and the timeline of planned blocks and actual
// bars. A past day can be logged; a day to come opens the edit sheet on "This day only".

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function DayPage() {
  const { date } = useParams()
  const today = toDateKey(new Date())
  if (!isDateKey(date)) return <Navigate to="/calendar" replace />
  // Today has its own tab.
  if (date === today) return <Navigate to="/" replace />
  return <DayView key={date} date={date} />
}

function WeekStrip({ date, data, today }: { date: DateKey; data: CalendarData | null; today: DateKey }) {
  const navigate = useNavigate()
  const week = weekOf(date)
  return (
    <div role="group" aria-label={`Week of ${format(parseDateKey(week[0] ?? date), 'MMMM d')}`} className="mx-3 mt-3 grid grid-cols-7 gap-0.5">
      {week.map((day, i) => {
        const info = data ? dayInfo(day, data) : null
        const ring = info?.kind === 'scored' && info.score.status !== 'empty' ? info.score.percents : null
        const percent = info?.kind === 'scored' ? headlinePercent(info.score) : null
        const selected = day === date
        const isToday = day === today
        const label = [
          `${isToday ? 'Today, ' : ''}${format(parseDateKey(day), 'EEEE, MMMM d')}${selected ? ', selected' : ''}`,
          percent !== null ? `Day score${isToday ? ' so far' : ''} ${percent} percent` : '',
        ]
          .filter(Boolean)
          .join('. ')
        return (
          <button
            key={day}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={() => {
              if (day === date) return
              if (isToday) navigate('/')
              else navigate(dayPath(day), { replace: true })
            }}
            className={`flex h-16 flex-col items-center justify-center gap-1 rounded-18 border-0 p-0 text-ink ${
              selected ? 'bg-card' : 'bg-transparent'
            }`}
          >
            <span className="text-11 font-bold text-muted">{WEEKDAY_LETTERS[i]}</span>
            <span className="relative flex size-[34px] items-center justify-center">
              {ring && (
                <span className="absolute inset-0">
                  <ScoreRing followed={ring.followed} missed={ring.missed} size={34} stroke={3.5} />
                </span>
              )}
              <span
                className={`relative flex size-[25px] items-center justify-center rounded-full text-13 ${
                  selected ? 'bg-primary font-bold text-on-primary' : isToday ? 'bg-pill font-extrabold text-primary' : 'font-semibold'
                }`}
              >
                {parseDateKey(day).getDate()}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DayView({ date }: { date: DateKey }) {
  const now = useNow(60_000)
  const today = toDateKey(now)
  const past = date < today

  const settings = useLiveQuery(readSettings)
  const tasks = useLiveQuery(listTasks)
  // The first time a day is opened its blocks are created; after that the screen only reads them.
  useEffect(() => {
    getDay(date).catch((error: unknown) => console.error('Could not open that day', error))
  }, [date])
  const day = useLiveQuery(useCallback(() => peekDay(date), [date]))
  const { from: weekFrom, to: weekTo } = weekRange(date)
  const weekData = useLiveQuery(useCallback(() => peekRange(weekFrom, weekTo), [weekFrom, weekTo]))

  const [logId, setLogId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const [notice, setNotice] = useState({ tap: 0, message: '' })
  const showNotice = (message: string) => setNotice((n) => ({ tap: n.tap + 1, message }))

  const timeFormat = settings?.timeFormat ?? '12h'
  const tolerances = settings?.tolerances ?? defaultSettings().tolerances
  const blocks = day?.occurrences ?? []
  const allTasks = tasks ?? []
  const repeating = new Set(allTasks.filter((t) => t.repeat.kind !== 'once' && !hasEnded(t, date)).map((t) => t.id))
  const nowMs = now.getTime()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const score = scoreDay(blocks, { startedBy: startedByFor(date, today, nowMinutes) })
  const percent = headlinePercent(score)
  const plannedMinutes = blocks.reduce((sum, o) => sum + o.plannedMinutes, 0)

  const weekCalendar: CalendarData | null =
    weekData && tasks
      ? {
          today,
          nowMinutes,
          created: new Set(weekData.created),
          occurrences: weekData.occurrences,
          tasks,
          firstDataDate: firstDataDate(weekData.firstDay, tasks),
        }
      : null
  const known = weekCalendar ? dayInfo(date, weekCalendar).kind !== 'none' || !past : true

  // The timeline: a past day is all over (nothing is "now"), a day to come has not started.
  const timelineMinutes = past ? 24 * 60 + 1 : -1
  const spans = blocks.map(spanOf)
  const logged = blocks.flatMap((o) => actualSpan(o, nowMs) ?? [])
  const range = visibleRange([...spans, ...logged], settings?.dayStart ?? '05:00', settings?.dayEnd ?? '23:00')

  // Open the timeline at the first block.
  const scroller = useRef<HTMLDivElement>(null)
  const scrolled = useRef(false)
  const ready = day?.created === true && settings !== undefined
  useLayoutEffect(() => {
    const el = scroller.current
    if (!ready || scrolled.current || !el) return
    scrolled.current = true
    const first = spans.reduce((min, s) => Math.min(min, s.start), Number.POSITIVE_INFINITY)
    if (Number.isFinite(first)) el.scrollTop = Math.max(0, Math.min(yAt(first, range) - 24, timelineHeight(range) - el.clientHeight))
  })

  const openBlock = async (o: Occurrence) => {
    // A block still to come with nothing logged opens the edit sheet; everything else is logged.
    if (!past && isUnlogged(o)) {
      const task = await getTask(o.taskId)
      if (task) setSheet({ kind: 'edit', task })
      else showNotice('That block is no longer in your routines.')
      return
    }
    setLogId(o.id)
  }

  const logging = logId === null ? undefined : blocks.find((o) => o.id === logId)
  const heading = format(parseDateKey(date), 'EEEE, MMM d')

  return (
    <div className="flex h-full flex-col tabular-nums">
      <div className="flex shrink-0 items-center justify-between pr-3 pl-2" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <Link to="/calendar" className="flex h-11 items-center gap-0.5 pr-3 pl-1 text-15 font-bold text-primary no-underline">
          <svg {...iconProps} width="22" height="22" strokeWidth="2.2">
            <path d="M14.5 6l-6 6 6 6" />
          </svg>
          Calendar
        </Link>
        {past && (
          <Link
            to={reviewPath(date)}
            state={reviewState('calendar')}
            className="flex h-11 items-center px-2 text-15 font-bold text-primary no-underline"
          >
            Review
          </Link>
        )}
      </div>
      <h1 className="m-0 mx-5 mt-0.5 shrink-0 font-display text-30 leading-[1.15] font-bold tracking-[-0.03em]">{heading}</h1>

      <WeekStrip date={date} data={weekCalendar} today={today} />

      {ready && past && known && (
        <Link
          to={reviewPath(date)}
          state={reviewState('calendar')}
          aria-label={`Day score ${percent === null ? 'not available' : `${percent} percent`}. Open day review`}
          className="mx-4 mt-3 flex shrink-0 items-center gap-3 rounded-18 border border-line bg-card py-3 pr-2.5 pl-4 text-ink no-underline"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <DayBar followed={score.percents.followed} missed={score.percents.missed} unknown={score.percents.unknown} height={8} />
            <span className="text-13 font-semibold">
              {score.status === 'empty' ? (
                'Nothing was planned for this day'
              ) : percent === null ? (
                <>
                  <span className="font-extrabold">–</span> <span className="font-medium text-muted">· nothing logged yet</span>
                </>
              ) : (
                <>
                  <span className="font-extrabold">{percent}%</span> followed{' '}
                  <span className="font-medium text-muted">· {plannedLine(blocks.length, plannedMinutes)}</span>
                </>
              )}
            </span>
          </span>
          <svg {...iconProps} width="20" height="20" strokeWidth="2.2" className="shrink-0 text-muted">
            <path d="M9.5 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      {ready && !past && (
        <p className="m-0 mx-4 mt-3 shrink-0 rounded-18 border border-line bg-card px-4 py-3 text-13 font-semibold">
          {blocks.length === 0 ? 'Nothing planned for this day yet.' : `${plannedLine(blocks.length, plannedMinutes)} planned`}
        </p>
      )}

      {ready && (
        <div ref={scroller} role="region" aria-label={`Timeline for ${format(parseDateKey(date), 'EEEE, MMMM d')}`} className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <div aria-hidden="true" className="mb-1 flex justify-end gap-3 text-11 font-semibold text-muted">
            <span className="flex items-center gap-[5px]">
              <span className="h-3 w-1 rounded-2 bg-primary" />
              Actual
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="h-2.5 w-3.5 rounded-3 bg-line-strong" />
              Planned
            </span>
          </div>
          {blocks.length === 0 ? (
            <p className="m-0 mt-4 text-center text-14 font-medium text-muted">No blocks on this day.</p>
          ) : (
            <Timeline
              occurrences={blocks}
              range={range}
              nowMinutes={timelineMinutes}
              timeFormat={timeFormat}
              repeating={repeating}
              tolerances={tolerances}
              nowMs={nowMs}
              canStart={false}
              onBlockOpen={(o) => void openBlock(o)}
              onBlockQuick={(o) => void openBlock(o)}
            />
          )}
        </div>
      )}

      {logging && (
        <LogSheet
          key={logging.id}
          occurrence={logging}
          timeFormat={timeFormat}
          allowTimer={false}
          onClosed={() => setLogId(null)}
        />
      )}

      {sheet && (
        <TaskSheet
          key={`${sheet.kind}-${'task' in sheet ? sheet.task.id : 'new'}`}
          mode={sheet}
          tasks={allTasks.filter((t) => !hasEnded(t, date))}
          timeFormat={timeFormat}
          today={date}
          initialScope="day"
          onDuplicate={(task) => setSheet({ kind: 'duplicate', task })}
          onClosed={() => setSheet(null)}
        />
      )}

      <ComingSoonToast tap={notice.tap} onDone={() => setNotice((n) => ({ ...n, tap: 0 }))} message={notice.message} />
    </div>
  )
}
