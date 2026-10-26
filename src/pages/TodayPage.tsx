import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { useNow } from '../app/useNow'
import { unlockAudio, useAudioState } from '../sound/audio'
import { useWakeLock } from '../sound/useWakeLock'
import { clearAbsences, useAbsences } from '../app/away'
import {
  defaultSettings,
  getDay,
  getTask,
  hasEnded,
  isUnlogged,
  listTasks,
  peekDay,
  peekRange,
  readSettings,
  toDateKey,
  updateSettings,
  type Occurrence,
  type Task,
} from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { scoreDay } from '../scoring'
import { LogSheet } from './log/LogSheet'
import { useStartTimer } from './log/useStartTimer'
import { reviewPath, reviewState } from './review/nav'
import { actualSpan } from './today/actuals'
import { FirstRun, NothingToday } from './today/EmptyStates'
import { NowNextCard } from './today/NowNextCard'
import { Timeline } from './today/Timeline'
import { TodayHeader } from './today/TodayHeader'
import { MutedToast, SoundBanner, type SoundButtonState } from './today/SoundControls'
import {
  blockLook,
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
import { TaskSheet, type SheetMode } from './tasks/TaskSheet'
import { TodoSheet } from './tasks/TodoSheet'
import { cardList, missedBlocks, oldestAwayDay } from './review/flow'
import { ReviewSheet } from './review/ReviewSheet'
import { AwayCard } from './today/AwayCard'

/** The now line moves in steps of this many seconds. */
const LINE_STEP_SECONDS = 15
/** Coming back to the app after this long scrolls the timeline back to the current time. */
const RESCROLL_AFTER_MS = 60_000

export function TodayPage() {
  const navigate = useNavigate()
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

  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const [logId, setLogId] = useState<string | null>(null)
  // The blocks "Review today" steps through when opened from the While you were away card.
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)
  const absences = useAbsences()
  // The last week of blocks, for the While you were away card (and Review from it).
  const awayFrom = oldestAwayDay(date)
  const recent = useLiveQuery(useCallback(() => peekRange(awayFrom, date), [awayFrom, date]))
  // A short message at the bottom (a problem starting a timer, or opening a block). tap 0 = hidden.
  const [notice, setNotice] = useState({ tap: 0, message: '' })
  const hideNotice = useCallback(() => setNotice((n) => ({ ...n, tap: 0 })), [])
  const showNotice = (message: string) => setNotice((n) => ({ tap: n.tap + 1, message }))
  const starter = useStartTimer(showNotice)
  const [todoOpen, setTodoOpen] = useState(false)

  // Sounds: the header button, the "Tap to turn on sounds" banner and the muted toast.
  const audio = useAudioState()
  const [mutedToast, setMutedToast] = useState(0)
  const hideMutedToast = useCallback(() => setMutedToast(0), [])

  const scroller = useRef<HTMLDivElement>(null)
  const needsScroll = useRef(true)

  const timeFormat = settings?.timeFormat ?? '12h'
  const tasks = (allTasks ?? []).filter((t) => !hasEnded(t, date))
  const blocks = day?.occurrences ?? []

  const spans = blocks.map(spanOf)
  const nowMs = now.getTime()
  // The timeline also reaches the times actually logged, in case a log runs outside the plan.
  const logged = blocks.flatMap((o) => actualSpan(o, nowMs) ?? [])
  const range = visibleRange([...spans, ...logged], settings?.dayStart ?? '05:00', settings?.dayEnd ?? '23:00')
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

  // Tapping a block: a past, current or already logged block opens Log time; a block still to
  // come opens the edit sheet, with "This day only" selected.
  const openBlock = async (o: Occurrence) => {
    const comingUp = isUnlogged(o) && minutesOfDay(now) < spanOf(o).start
    if (!comingUp) {
      setLogId(o.id)
      return
    }
    const task: Task | undefined = await getTask(o.taskId)
    if (task) setSheet({ kind: 'edit', task })
    else showNotice('That block is no longer in your routines.')
  }

  // The round button: start the timer on a block that is current or coming; stop it, or edit
  // the log, by opening Log time on the others.
  const quickTap = (o: Occurrence) => {
    const look = blockLook(o, minutesOfDay(now))
    if (look === 'current' || look === 'upcoming') void starter.start(o)
    else setLogId(o.id)
  }

  const logging = logId === null ? undefined : blocks.find((o) => o.id === logId)
  const tolerances = settings?.tolerances ?? defaultSettings().tolerances
  // The Day score so far: only blocks whose planned start has passed count.
  const score = scoreDay(blocks, { startedBy: minutesOfDay(now) })
  const openReview = () => navigate(reviewPath(date), { state: reviewState('today') })

  // What passed while the app was closed or in the background and is still not logged. It stays
  // until dismissed, logged, or more than a week old (then the saved absences are cleared).
  const recentBlocks = recent?.occurrences ?? []
  const missed = absences && absences.length > 0 ? missedBlocks(recentBlocks, absences, date, now.getTime()) : []
  const awayList = cardList(missed)
  const nothingLeft = recent !== undefined && absences !== undefined && absences.length > 0 && missed.length === 0
  useEffect(() => {
    if (nothingLeft) void clearAbsences()
  }, [nothingLeft])
  const logMissed = () => setReviewIds(missed.map((o) => o.id))

  const soundsOn = settings?.soundsOn ?? true
  const soundState: SoundButtonState = !soundsOn ? 'muted' : audio === 'locked' ? 'needs-tap' : 'on'
  // Keep screen on (Settings): hold the screen awake while Today is showing.
  useWakeLock(settings?.keepScreenOn === true)

  const turnSoundsOn = async () => {
    setMutedToast(0)
    await unlockAudio()
    await updateSettings({ soundsOn: true })
  }
  // Every tap on the button also unlocks audio, which iPhone needs before any sound plays.
  const onSoundTap = async () => {
    if (soundState === 'muted') return turnSoundsOn()
    await unlockAudio()
    if (soundState === 'on') {
      await updateSettings({ soundsOn: false })
      setMutedToast((n) => n + 1)
    }
  }

  const repeating = new Set(tasks.filter((t) => t.repeat.kind !== 'once').map((t) => t.id))
  const card = nowNext(spans, secondsOfDay(now))

  return (
    <div className="flex h-full flex-col">
      <TodayHeader now={now} date={date} score={score} sound={soundState} onSoundTap={() => void onSoundTap()} />

      {soundState === 'needs-tap' && <SoundBanner onTap={() => void unlockAudio()} />}

      {ready && tasks.length === 0 && (
        <FirstRun
          onAddBlock={() => setSheet({ kind: 'new' })}
          onJotTodo={() => setTodoOpen(true)}
        />
      )}

      {ready && absences && absences.length > 0 && missed.length > 0 && (
        <AwayCard
          absences={absences}
          shown={awayList.shown}
          more={awayList.more}
          today={date}
          timeFormat={timeFormat}
          onLogNow={logMissed}
          onDismiss={() => void clearAbsences()}
        />
      )}

      {ready && tasks.length > 0 && blocks.length === 0 && <NothingToday onAddBlock={() => setSheet({ kind: 'new' })} />}

      {showTimeline && (
        <>
          <NowNextCard state={card} timeFormat={timeFormat} onReviewDay={openReview} />
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
              tolerances={tolerances}
              nowMs={nowMs}
              onBlockOpen={(o) => void openBlock(o)}
              onBlockQuick={quickTap}
            />
          </div>
        </>
      )}

      {sheet && (
        <TaskSheet
          // A different sheet (for example Duplicate opened from Edit) starts fresh.
          key={`${sheet.kind}-${'task' in sheet ? sheet.task.id : 'new'}`}
          mode={sheet}
          tasks={tasks}
          timeFormat={timeFormat}
          today={date}
          initialScope="day"
          onDuplicate={(task) => setSheet({ kind: 'duplicate', task })}
          onClosed={() => setSheet(null)}
        />
      )}

      {logging && <LogSheet
          key={logging.id}
          occurrence={logging}
          timeFormat={timeFormat}
          onClosed={() => setLogId(null)}
        />}

      {starter.dialog}

      {reviewIds && (
        <ReviewSheet
          date={date}
          ids={reviewIds}
          occurrences={recentBlocks}
          repeating={repeating}
          timeFormat={timeFormat}
          onDone={openReview}
          onClosed={() => setReviewIds(null)}
        />
      )}

      {todoOpen && (
        <TodoSheet
          onClosed={(wasAdded) => {
            setTodoOpen(false)
            // Show where the to-do went: the Inbox on the Tasks tab.
            if (wasAdded) navigate('/tasks')
          }}
        />
      )}

      <MutedToast tap={mutedToast} onUndo={() => void turnSoundsOn()} onDone={hideMutedToast} />
      <ComingSoonToast tap={notice.tap} onDone={hideNotice} message={notice.message} />
    </div>
  )
}
