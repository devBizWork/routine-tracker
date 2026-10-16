import { format } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { useNow } from '../app/useNow'
import { defaultSettings, getDay, hasEnded, listTasks, parseDateKey, peekDay, readSettings, today as todayKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { scoreDay, startedByFor } from '../scoring'
import { blocksToReview } from './review/flow'
import { backTarget, isReviewDate } from './review/nav'
import { PlannedVsActual } from './review/PlannedVsActual'
import { ReviewSheet } from './review/ReviewSheet'
import { reviewRows } from './review/rows'
import { DayScoreCard, LoggedScoreCard } from './review/ScoreCards'

// The Day review (design/screens/DayReview.html), at #/day/:date/review: the two scores and the
// day's blocks, planned against actual. "Log remaining tasks" arrives with Step 8.

const chevron = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14.5 6l-6 6 6 6" />
  </svg>
)

export function DayReviewPage() {
  const { date } = useParams()
  if (!isReviewDate(date)) return <Navigate to="/" replace />
  return <Review date={date} />
}

function Review({ date }: { date: string }) {
  const back = backTarget(useLocation().state)
  const now = useNow(15_000)
  const today = todayKey()

  const settings = useLiveQuery(readSettings)
  // The first time a day is opened its blocks are created; after that the screen only reads them.
  useEffect(() => {
    getDay(date).catch((error: unknown) => console.error('Could not open that day', error))
  }, [date])
  const day = useLiveQuery(useCallback(() => peekDay(date), [date]))

  const tasks = useLiveQuery(listTasks)
  // The blocks "Review today" steps through, fixed when it opens.
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)

  const ready = settings !== undefined && day?.created === true
  const tolerances = settings?.tolerances ?? defaultSettings().tolerances
  const timeFormat = settings?.timeFormat ?? '12h'
  const blocks = day?.occurrences ?? []

  // On today only the blocks that have started count; a past day counts them all.
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const score = scoreDay(blocks, { startedBy: startedByFor(date, today, nowMinutes) })
  const rows = reviewRows(score.items, tolerances, timeFormat)
  // "Log remaining tasks": the blocks with nothing logged whose planned end has passed.
  const toReview = blocksToReview(blocks, date, today, nowMinutes)
  const repeating = new Set((tasks ?? []).filter((t) => t.repeat.kind !== 'once' && !hasEnded(t, date)).map((t) => t.id))
  const notCounted = blocks.filter((o) => o.plannedMinutes > 0).length - score.items.length

  return (
    <div className="flex min-h-full flex-col pb-6">
      <div className="flex items-center pr-3 pl-2" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <Link
          to={back.to}
          className="flex h-11 items-center gap-0.5 pr-3 pl-1 text-15 font-bold text-primary no-underline"
        >
          {chevron}
          {back.label}
        </Link>
      </div>

      <header className="flex flex-col gap-0.5 px-5 pt-1">
        <p className="m-0 text-14 font-semibold text-muted">{format(parseDateKey(date), 'EEEE, MMMM d')}</p>
        <h1 className="m-0 font-display text-32 leading-[1.1] font-bold tracking-[-0.03em]">Day review</h1>
      </header>

      {ready && score.status === 'empty' && (
        <section
          aria-labelledby="nothing-h"
          className="mx-4 mt-4 flex flex-col gap-1.5 rounded-24 border border-line bg-card px-[18px] py-4"
        >
          <h2 id="nothing-h" className="m-0 font-sans text-17 font-bold">
            Nothing to score yet
          </h2>
          <p className="m-0 text-14 leading-[1.45] font-medium text-muted">
            {blocks.length === 0
              ? 'Nothing was planned for this day.'
              : 'No block has started yet. A block counts from the minute it is planned to start.'}
          </p>
        </section>
      )}

      {ready && score.status !== 'empty' && (
        <>
          {score.status !== 'complete' && <LoggedScoreCard score={score} />}
          <DayScoreCard score={score} />
          <PlannedVsActual rows={rows} />

          {notCounted > 0 && (
            <p className="m-0 mx-5 mt-2 text-12-5 font-medium text-muted">
              {notCounted === 1 ? '1 block' : `${notCounted} blocks`} later today {notCounted === 1 ? 'is' : 'are'} not
              counted yet.
            </p>
          )}

          {toReview.length > 0 && (
            <button
              type="button"
              onClick={() => setReviewIds(toReview.map((o) => o.id))}
              className="mx-4 mt-4 flex h-[54px] items-center justify-center gap-2.5 rounded-27 border-0 bg-primary text-16 font-bold text-on-primary"
            >
              Log remaining tasks
              <span className="flex h-6 min-w-6 items-center justify-center rounded-12 bg-pill px-1.5 text-13 font-extrabold text-primary">
                {toReview.length}
              </span>
            </button>
          )}
        </>
      )}

      {reviewIds && (
        <ReviewSheet
          date={date}
          ids={reviewIds}
          occurrences={blocks}
          repeating={repeating}
          timeFormat={timeFormat}
          onDone={() => setReviewIds(null)}
          onClosed={() => setReviewIds(null)}
        />
      )}
    </div>
  )
}
