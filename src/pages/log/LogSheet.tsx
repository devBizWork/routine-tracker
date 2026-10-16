import { useId, useState } from 'react'
import { ActionSheet } from '../../app/ActionSheet'
import { BottomSheet } from '../../app/BottomSheet'
import { useNow } from '../../app/useNow'
import {
  categoryColor,
  clearLogPatch,
  doneAsPlannedPatch,
  elapsedSeconds,
  formatDuration,
  formatElapsed,
  formatMinutesAsTime,
  formatRange,
  formatTime,
  plannedEndMinutes,
  progressLine,
  skippedPatch,
  startRelation,
  stopTimer,
  timeToMinutes,
  updateOccurrence,
  type Occurrence,
  type TimeFormat,
} from '../../data'
import { taskScore } from '../../scoring'
import { TimeBox } from '../tasks/fields'
import {
  canSaveLog,
  canStartTimer,
  hasLog,
  initialLogForm,
  isLogDirty,
  loggedMinutes,
  logTimeProblem,
  saveLogPatch,
  timerStartText,
  type LogForm,
} from './logForm'
import { useStartTimer } from './useStartTimer'

const STRIPES =
  'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

/**
 * The Log time sheet (design/screens/LogTime.html): start or stop the timer, "Done as planned",
 * "Skipped", times typed by hand, a note. A block that already has a log opens with it filled in
 * and a "Clear log" link. `occurrence` is the block as saved right now; the sheet keeps what is
 * typed until it is saved or closed.
 */
export function LogSheet({
  occurrence: o,
  timeFormat,
  onClosed,
}: {
  occurrence: Occurrence
  timeFormat: TimeFormat
  onClosed: () => void
}) {
  const titleId = useId()
  const noteId = useId()
  const now = useNow(1000)
  const nowMs = now.getTime()

  const [initial, setInitial] = useState<LogForm>(() => initialLogForm(o))
  const [form, setForm] = useState<LogForm>(initial)
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState<'discard' | 'clear' | null>(null)
  const starter = useStartTimer(setError)

  const running = o.timerStartedAt !== null
  const dirty = isLogDirty(form, initial)
  const timeIssue = logTimeProblem(form)
  const savable = canSaveLog(form, running) && !busy
  const plannedEnd = plannedEndMinutes(o)
  const plannedRange = `${formatTime(o.plannedStart, timeFormat)} – ${formatMinutesAsTime(plannedEnd, timeFormat)}`
  const copiesRange = formatRange(timeToMinutes(o.plannedStart), plannedEnd, timeFormat)

  const requestClose = () => {
    if (closing || busy) return
    if (dirty) setAsking('discard')
    else setClosing(true)
  }

  // One place for the "save something, then close" pattern, with the problem shown if it fails.
  const run = async (work: () => Promise<void>, closeAfter = true) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await work()
      if (closeAfter) setClosing(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const note = form.note.trim()
  const doneAsPlanned = () => run(async () => void (await updateOccurrence(o.id, doneAsPlannedPatch(o, note))))
  const skipped = () => run(async () => void (await updateOccurrence(o.id, skippedPatch(note))))
  const save = () => run(async () => void (await updateOccurrence(o.id, saveLogPatch(o, form))))
  const stop = () =>
    run(async () => {
      if (note !== o.note) await updateOccurrence(o.id, { note })
      const stopped = await stopTimer(o.id)
      // Stop fills Started and Ended; the sheet stays open so they can be adjusted.
      const filled = initialLogForm(stopped)
      setInitial(filled)
      setForm(filled)
    }, false)
  const startTimer = async () => {
    setError(null)
    await starter.start(o)
  }

  // ---- What the timer card, the times and the progress line show ----
  const startedText = timerStartText(o)
  const minutes = loggedMinutes(o, form, nowMs)
  const progress = minutes === null ? null : progressLine(o.plannedMinutes, minutes)
  // The Task score of what is on the form right now (a timer still running has no score yet).
  const score = running
    ? null
    : form.start !== '' && form.end !== '' && timeIssue === null
      ? taskScore({ ...o, status: 'done', actualStart: form.start, actualEnd: form.end })
      : o.status === 'skipped'
        ? 0
        : null

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 pb-3">
      <h2 id={titleId} className="m-0 ml-1 font-display text-24 font-bold">
        Log time
      </h2>
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className="flex size-11 items-center justify-center rounded-full border-0 bg-line text-ink"
      >
        <svg {...iconProps} width="18" height="18" strokeWidth="2.2">
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </svg>
      </button>
    </div>
  )

  const overlay = (
    <>
      {starter.dialog}
      {asking === 'discard' && (
        <ActionSheet
          title="Discard your changes?"
          message="What you changed in this log will be lost."
          actions={[{ label: 'Discard', danger: true, onSelect: () => undefined }]}
          cancelLabel="Keep editing"
          onClosed={(chosen) => {
            setAsking(null)
            if (chosen !== null) setClosing(true)
          }}
        />
      )}
      {asking === 'clear' && (
        <ActionSheet
          title="Clear this log?"
          message={`${o.title} goes back to Unknown. Nothing else changes.`}
          actions={[
            {
              label: 'Clear log',
              danger: true,
              onSelect: async () => {
                await updateOccurrence(o.id, clearLogPatch())
              },
            },
          ]}
          onClosed={(chosen) => {
            setAsking(null)
            if (chosen !== null) setClosing(true)
          }}
        />
      )}
    </>
  )

  return (
    <BottomSheet
      labelledBy={titleId}
      onRequestClose={requestClose}
      closing={closing}
      onClosed={onClosed}
      header={header}
      overlay={overlay}
      blocked={asking !== null || starter.asking}
    >
      <div className="flex flex-col gap-3 tabular-nums">
        {/* The block: its color, title and plan. */}
        <div className="flex items-center gap-3 rounded-20 border border-line bg-card px-3.5 py-3">
          <span
            aria-hidden="true"
            className="size-[42px] shrink-0 rounded-12"
            style={{ background: categoryColor(o.color) }}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-16 font-bold break-words">{o.title}</span>
            <span className="text-13 font-medium text-muted">
              Planned {plannedRange} · {formatDuration(o.plannedMinutes)}
            </span>
          </span>
        </div>

        {/* The timer. */}
        {running && startedText !== null && o.timerStartedAt !== null && (
          <div className="flex items-center gap-3 rounded-24 bg-primary py-4 pr-4 pl-[18px] text-on-primary">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-11 font-extrabold tracking-[0.08em] text-pill">
                <span aria-hidden="true" className="size-[7px] rounded-4 bg-pill" />
                TIMER RUNNING
              </span>
              <span role="timer" className="font-display text-50 leading-none font-bold tracking-[-0.01em]">
                {formatElapsed(elapsedSeconds(o.timerStartedAt, nowMs))}
              </span>
              <span className="text-13 font-medium text-pill">
                Started {formatTime(startedText, timeFormat)} · {startRelation(o.plannedStart, startedText)}
              </span>
            </div>
            <button
              type="button"
              aria-label="Stop timer"
              disabled={busy}
              onClick={() => void stop()}
              className="flex size-[68px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-0 bg-card p-0 text-11 font-extrabold text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
              </svg>
              STOP
            </button>
          </div>
        )}
        {!running && canStartTimer(o) && (
          <button
            type="button"
            onClick={() => void startTimer()}
            className="flex min-h-[64px] items-center gap-3 rounded-24 border border-line bg-card px-4 py-3 text-left text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-15 font-bold">Start timer</span>
              <span className="text-12 font-medium text-muted">Time it as you go, then tap Stop</span>
            </span>
          </button>
        )}

        {/* Two quick answers. */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void doneAsPlanned()}
            className="flex min-h-[76px] flex-col items-start gap-1.5 rounded-20 border border-line bg-card px-3.5 py-3 text-left text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              <svg {...iconProps} width="15" height="15" strokeWidth="2.8">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-14-5 font-bold">Done as planned</span>
              <span className="text-12 font-medium text-muted">Copies {copiesRange}</span>
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void skipped()}
            className="flex min-h-[76px] flex-col items-start gap-1.5 rounded-20 border border-line bg-card px-3.5 py-3 text-left text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-line text-muted"
            >
              <svg {...iconProps} width="15" height="15" strokeWidth="2.4">
                <circle cx="12" cy="12" r="8" />
                <path d="M6.5 6.5l11 11" />
              </svg>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-14-5 font-bold">Skipped</span>
              <span className="text-12 font-medium text-muted">Counts as 0%</span>
            </span>
          </button>
        </div>

        <div aria-hidden="true" className="my-0.5 flex items-center gap-2.5 text-12 font-bold text-muted">
          <span className="h-px flex-1 bg-line" />
          or enter times
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* Started and Ended, with the phone's own time pickers. */}
        <div className="grid grid-cols-2 gap-2.5">
          <TimeBox
            caption="Started"
            display={
              running && startedText !== null
                ? formatTime(startedText, timeFormat)
                : form.start === ''
                  ? 'Choose'
                  : formatTime(form.start, timeFormat)
            }
            value={running ? (startedText ?? '') : form.start}
            ariaLabel="Actual start"
            disabled={running}
            onChange={(v) => setForm((f) => ({ ...f, start: v }))}
          />
          <TimeBox
            caption={running ? 'Ended · now' : 'Ended'}
            display={
              running
                ? formatTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, timeFormat)
                : form.end === ''
                  ? 'Choose'
                  : formatTime(form.end, timeFormat)
            }
            value={running ? '' : form.end}
            ariaLabel="Actual end"
            disabled={running}
            onChange={(v) => setForm((f) => ({ ...f, end: v }))}
          />
        </div>
        {timeIssue && (
          <p role="alert" className="m-0 px-1 text-12-5 font-semibold text-missed-text">
            {timeIssue}
          </p>
        )}

        {/* How much of the plan the log covers. */}
        <div className="flex flex-col gap-1.5 px-1">
          <div aria-hidden="true" className="h-1.5 rounded-3" style={{ background: STRIPES }}>
            <div className="h-1.5 rounded-3 bg-primary" style={{ width: `${(progress?.fraction ?? 0) * 100}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-12-5 font-semibold">
            {progress ? (
              <span>
                <span className="font-extrabold">{progress.text}</span>{' '}
                <span className="text-muted">· {progress.label}</span>
              </span>
            ) : (
              <span className="text-muted">{formatDuration(o.plannedMinutes)} planned</span>
            )}
            <span className="text-muted">Task score {score === null ? '–' : `${Math.round(score * 100)}%`}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-20 border border-line bg-card px-4 py-3 focus-within:border-primary">
          <label htmlFor={noteId} className="text-12 font-bold text-muted">
            Note
          </label>
          <textarea
            id={noteId}
            rows={2}
            placeholder="Optional, like what got in the way"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="h-[48px] resize-none border-0 bg-transparent p-0 text-16 leading-[1.45] font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>

        {error && (
          <p role="alert" className="m-0 px-1 text-12-5 font-semibold text-missed-text">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!savable}
          onClick={() => void save()}
          className="mt-1 h-[54px] rounded-27 border-0 bg-primary text-16 font-bold text-on-primary disabled:bg-line disabled:text-muted"
        >
          Save log
        </button>
        {!savable && !running && timeIssue === null && (
          <p className="m-0 px-1 text-center text-12-5 font-medium text-muted">
            Enter Started and Ended, or tap Done as planned or Skipped.
          </p>
        )}
        {hasLog(o) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsking('clear')}
            className="h-11 border-0 bg-transparent text-14 font-bold text-missed-text"
          >
            Clear log
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
