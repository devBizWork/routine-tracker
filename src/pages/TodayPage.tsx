import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { useNow } from '../app/useNow'
import { getDay, hasEnded, listTasks, peekDay, readSettings, toDateKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { FirstRun, NothingToday } from './today/EmptyStates'
import { NowNextCard } from './today/NowNextCard'
import { Timeline } from './today/Timeline'
import { TodayHeader } from './today/TodayHeader'
import {
  minutesOfDay,
  nowNext,
  roundDown,
  scrollTopFor,
  secondsOfDay,
  spanOf,
  timelineHeight,
  visibleRange,
  yAt,
} from './today/plan'
import { TaskSheet } from './tasks/TaskSheet'
import { TodoSheet } from './tasks/TodoSheet'

/** The now line moves in steps of this many seconds. */
const LINE_STEP_SECONDS = 15
/** Coming back to the app after this long scrolls the timeline back to the current time. */
const RESCROLL_AFTER_MS = 60_000

export function TodayPage() {
  // Ticks every second (for the countdown) and again the moment the app returns to the
  // foreground. The date follows it, so at midnight the screen moves on to the next day.
  const now = useNow(1000)
  const date = toDateKey(now)

  const settings = useLiveQuery(readSettings)
  const allTasks = useLiveQuery(listTasks)
  // The first time a day is opened its blocks are created from the tasks that apply; after
  // that the screen only reads them (and follows any change made on the Tasks screen).
  useEffect(() => {
    getDay(date).catch((error: unknown) => console.error('Could not open today', error))
  }, [date])
  const day = useLiveQuery(useCallback(() => peekDay(date), [date]))

  const [sheetOpen, setSheetOpen] = useState(false)
  const [todoOpen, setTodoOpen] = useState(false)
  const [added, setAdded] = useState(0) // changes with every to-do added, to show the note
  const hideAdded = useCallback(() => setAdded(0), [])
  const [soon, setSoon] = useState(0)
  const comingSoon = () => setSoon((n) => n + 1)
  const hideSoon = useCallback(() => setSoon(0), [])

  const scroller = useRef<HTMLDivElement>(null)
  const needsScroll = useRef(true)

  const timeFormat = settings?.timeFormat ?? '12h'
  const tasks = (allTasks ?? []).filter((t) => !hasEnded(t, date))
  const blocks = day?.occurrences ?? []

  const spans = blocks.map(spanOf)
  const range = visibleRange(spans, settings?.dayStart ?? '05:00', settings?.dayEnd ?? '23:00')
  const lineNow = roundDown(now, LINE_STEP_SECONDS)
  const lineMinutes = minutesOfDay(lineNow)

  const ready = allTasks !== undefined && settings !== undefined && day?.created === true
  const showTimeline = ready && blocks.length > 0

  // Scroll so the now line sits about a third of the way down. Done when the timeline first
  // appears, when the date changes, and when you come back after a while away.
  const scrollToNow = () => {
    const el = scroller.current
    if (!el) return
    const anchor = lineMinutes < range.start ? range.start : lineMinutes > range.end ? range.end : lineMinutes
    el.scrollTop = scrollTopFor(yAt(anchor, range), el.clientHeight, timelineHeight(range))
  }

  useLayoutEffect(() => {
    if (showTimeline && needsScroll.current) {
      needsScroll.current = false
      scrollToNow()
    }
  })

  useEffect(() => {
    needsScroll.current = true
  }, [date])

  useEffect(() => {
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt !== null && Date.now() - hiddenAt >= RESCROLL_AFTER_MS) {
        needsScroll.current = true
        hiddenAt = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const repeating = new Set(tasks.filter((t) => t.repeat.kind !== 'once').map((t) => t.id))
  const card = nowNext(spans, secondsOfDay(now))

  return (
    <div className="flex h-full flex-col">
      <TodayHeader now={now} onComingSoon={comingSoon} />

      {ready && tasks.length === 0 && (
        <FirstRun
          onAddBlock={() => setSheetOpen(true)}
          onJotTodo={() => setTodoOpen(true)}
        />
      )}

      {ready && tasks.length > 0 && blocks.length === 0 && <NothingToday onAddBlock={() => setSheetOpen(true)} />}

      {showTimeline && (
        <>
          <NowNextCard state={card} timeFormat={timeFormat} onReviewDay={comingSoon} />
          <div
            ref={scroller}
            aria-label="Timeline"
            role="region"
            className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          >
            <Timeline
              occurrences={blocks}
              range={range}
              nowMinutes={lineMinutes}
              timeFormat={timeFormat}
              repeating={repeating}
              onBlockTap={comingSoon}
            />
          </div>
        </>
      )}

      {sheetOpen && (
        <TaskSheet
          mode={{ kind: 'new' }}
          tasks={tasks}
          timeFormat={timeFormat}
          today={date}
          onDuplicate={() => undefined}
          onClosed={() => setSheetOpen(false)}
        />
      )}

      {todoOpen && (
        <TodoSheet
          onClosed={(wasAdded) => {
            setTodoOpen(false)
            if (wasAdded) setAdded((n) => n + 1)
          }}
        />
      )}

      <ComingSoonToast tap={soon} onDone={hideSoon} />
      <ComingSoonToast tap={added} onDone={hideAdded} message="Added to your Inbox (Tasks tab)" />
    </div>
  )
}
