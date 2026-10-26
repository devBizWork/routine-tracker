import { format } from 'date-fns'
import { useId, useState } from 'react'
import { BottomSheet } from '../../app/BottomSheet'
import { useNow } from '../../app/useNow'
import {
  categoryColor,
  formatDuration,
  formatTime,
  minutesToTime,
  parseDateKey,
  plannedEndMinutes,
  today as todayKey,
  updateOccurrence,
  type LogPatch,
  type Occurrence,
  type TimeFormat,
  type TimeOfDay,
} from '../../data'
import { headlinePercent, scoreDay, startedByFor } from '../../scoring'
import { TimeBox } from '../tasks/fields'
import { answerLabel, answerPatch, logSnapshot, otherTimesProblem, plannedSpan, type Answer } from './flow'

// "Review today" (design/screens/ReviewFlow.html): one unlogged block at a time, "What happened?",
// then the next one slides in. Every answer is saved at once, so closing keeps what was given.

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

const check = (size: number) => (
  <svg {...iconProps} width={size} height={size} strokeWidth="2.8">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

interface LastAnswer {
  id: string
  title: string
  label: string
  /** The block's log before this answer (null for "Not sure", which changed nothing). */
  previous: LogPatch | null
  /** Where that block was in the list, so Undo can go back to it. */
  index: number
}

export function ReviewSheet({
  date,
  ids,
  occurrences,
  repeating,
  timeFormat,
  onDone,
  onClosed,
}: {
  date: string
  /** The blocks to go through, in order, fixed when the sheet opens. */
  ids: readonly string[]
  /** The day's blocks as saved right now. */
  occurrences: readonly Occurrence[]
  /** Task ids that repeat (their card says ROUTINE). */
  repeating: ReadonlySet<string>
  timeFormat: TimeFormat
  /** "Done" on the All caught up card. */
  onDone: () => void
  onClosed: () => void
}) {
  const titleId = useId()
  const now = useNow(30_000)
  const today = todayKey()

  const [index, setIndex] = useState(0)
  const [last, setLast] = useState<LastAnswer | null>(null)
  const [other, setOther] = useState<{ start: TimeOfDay | ''; end: TimeOfDay | '' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  // The blocks still there (one could have been deleted meanwhile), in the order given.
  const steps = ids.flatMap((id) => occurrences.find((o) => o.id === id) ?? [])
  const block = steps[index]
  const finished = index >= steps.length

  const run = async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const answer = (a: Answer) =>
    run(async () => {
      if (!block) return
      const previous = logSnapshot(block)
      const patch = answerPatch(block, a)
      if (patch) await updateOccurrence(block.id, patch)
      setLast({ id: block.id, title: block.title, label: answerLabel(a, timeFormat), previous: patch ? previous : null, index })
      setOther(null)
      setIndex(index + 1)
    })

  const undo = () =>
    run(async () => {
      if (!last) return
      if (last.previous) await updateOccurrence(last.id, last.previous)
      setIndex(last.index)
      setLast(null)
      setOther(null)
    })

  const back = () => {
    if (index === 0) return
    setOther(null)
    setError(null)
    setIndex(index - 1)
  }

  // Blocks from other days than `date` (the While you were away list can reach back a week).
  const otherDays = steps.some((o) => o.date !== date)
  const heading = otherDays
    ? 'Review missed blocks'
    : date === today
      ? 'Review today'
      : `Review ${format(parseDateKey(date), 'EEE, MMM d')}`
  const count = ids.length
  const subtitle = `${count === 1 ? '1 block wasn’t' : `${count} blocks weren’t`} logged. One tap each.`

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 pb-3">
      <div className="flex min-w-0 flex-col gap-px pl-1">
        <h2 id={titleId} className="m-0 font-display text-24 font-bold">
          {heading}
        </h2>
        <span className="text-13 font-medium text-muted">{subtitle}</span>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={() => setClosing(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-line text-ink"
      >
        <svg {...iconProps} width="18" height="18" strokeWidth="2.2">
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </svg>
      </button>
    </div>
  )

  return (
    <BottomSheet labelledBy={titleId} onRequestClose={() => setClosing(true)} closing={closing} onClosed={onClosed} header={header}>
      <div className="flex min-h-full flex-col gap-3 tabular-nums">
        {/* Progress: answered, current, still to come. */}
        <div className="flex items-center gap-2.5 px-1">
          <div aria-hidden="true" className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0, 1fr))` }}>
            {steps.map((step, i) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-3 ${i < index ? 'bg-primary' : i === index ? 'bg-aqua' : 'bg-line'}`}
              />
            ))}
          </div>
          <span className="text-13 font-extrabold">
            {finished ? `${steps.length} of ${steps.length}` : `${index + 1} of ${steps.length}`}
          </span>
        </div>

        {/* What the last answer did, with Undo. */}
        {last && (
          <div
            role="status"
            className="flex min-h-11 items-center gap-2 rounded-14 border border-line bg-card py-1 pr-1.5 pl-3 text-13 font-semibold"
          >
            <span
              aria-hidden="true"
              className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              {check(12)}
            </span>
            <span className="min-w-0 flex-1">
              {last.title} <span className="font-medium text-muted">· {last.label}</span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void undo()}
              className="h-11 shrink-0 border-0 bg-transparent px-2.5 text-13 font-extrabold text-primary"
            >
              Undo
            </button>
          </div>
        )}

        {block ? (
          <div key={block.id} className="review-step flex flex-col gap-3">
            <div
              className="mt-1 box-border flex min-h-32 flex-col justify-between gap-[18px] rounded-24 p-[18px] text-ink"
              style={{ background: categoryColor(block.color) }}
            >
              <span className="self-start rounded-9 bg-card px-[9px] py-[3px] text-11 font-extrabold tracking-[0.06em]">
                {repeating.has(block.taskId) ? 'ROUTINE' : 'ONE-OFF'}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-22 font-extrabold tracking-[-0.01em] break-words">{block.title}</span>
                <span className="text-14 font-semibold">
                  {block.date !== date && `${format(parseDateKey(block.date), 'EEE, MMM d')} · `}
                  Planned {plannedSpan(block, timeFormat)} · {formatDuration(block.plannedMinutes)}
                </span>
              </div>
            </div>

            <h3 className="m-0 mt-1.5 ml-1 font-sans text-13 font-bold text-muted">What happened?</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void answer({ kind: 'planned' })}
                className="flex min-h-16 items-center gap-3 rounded-20 border-0 bg-primary px-4 text-left text-on-primary"
              >
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pill text-primary">
                  {check(15)}
                </span>
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-15-5 font-bold">Done as planned</span>
                  <span className="text-12-5 font-medium text-pill">Logs {plannedSpan(block, timeFormat)}</span>
                </span>
              </button>

              <button
                type="button"
                aria-expanded={other !== null}
                disabled={busy}
                onClick={() =>
                  setOther(
                    other ? null : { start: block.plannedStart, end: minutesToTime(Math.min(plannedEndMinutes(block), 24 * 60 - 1)) },
                  )
                }
                className="flex min-h-16 items-center gap-3 rounded-20 border border-line bg-card px-4 text-left text-ink"
              >
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-line text-primary">
                  <svg {...iconProps} width="16" height="16" strokeWidth="2.2">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l2.5 1.5" />
                  </svg>
                </span>
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-15-5 font-bold">Done, at other times</span>
                  <span className="text-12-5 font-medium text-muted">Set when it started and ended</span>
                </span>
                <svg
                  {...iconProps}
                  width="18"
                  height="18"
                  strokeWidth="2.2"
                  className={`shrink-0 text-muted transition-transform ${other ? 'rotate-90' : ''}`}
                >
                  <path d="M9.5 6l6 6-6 6" />
                </svg>
              </button>

              {other && (
                <div className="flex flex-col gap-2.5 rounded-20 border border-line bg-card p-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <TimeBox
                      caption="Started"
                      display={other.start === '' ? 'Choose' : formatTime(other.start, timeFormat)}
                      value={other.start}
                      ariaLabel="Actual start"
                      onChange={(v) => setOther((o) => (o ? { ...o, start: v } : o))}
                    />
                    <TimeBox
                      caption="Ended"
                      display={other.end === '' ? 'Choose' : formatTime(other.end, timeFormat)}
                      value={other.end}
                      ariaLabel="Actual end"
                      onChange={(v) => setOther((o) => (o ? { ...o, end: v } : o))}
                    />
                  </div>
                  {otherTimesProblem(other.start, other.end) !== null && (other.start !== '' || other.end !== '') && (
                    <p role="alert" className="m-0 px-1 text-12-5 font-semibold text-missed-text">
                      {otherTimesProblem(other.start, other.end)}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={busy || otherTimesProblem(other.start, other.end) !== null}
                    onClick={() => {
                      if (other.start !== '' && other.end !== '') void answer({ kind: 'other', start: other.start, end: other.end })
                    }}
                    className="h-11 rounded-22 border-0 bg-primary text-15 font-bold text-on-primary disabled:bg-line disabled:text-muted"
                  >
                    Save
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => void answer({ kind: 'skipped' })}
                className="flex min-h-16 items-center gap-3 rounded-20 border border-line bg-card px-4 text-left text-ink"
              >
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-line text-muted">
                  <svg {...iconProps} width="15" height="15" strokeWidth="2.4">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M6.5 6.5l11 11" />
                  </svg>
                </span>
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-15-5 font-bold">Skipped</span>
                  <span className="text-12-5 font-medium text-muted">Counts as 0%</span>
                </span>
              </button>
            </div>

            {error && (
              <p role="alert" className="m-0 px-1 text-12-5 font-semibold text-missed-text">
                {error}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between pt-2">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="flex h-11 items-center gap-0.5 border-0 bg-transparent pr-3 pl-1 text-14-5 font-bold text-primary"
                >
                  <svg {...iconProps} width="20" height="20" strokeWidth="2.2">
                    <path d="M14.5 6l-6 6 6 6" />
                  </svg>
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void answer({ kind: 'unsure' })}
                className="flex min-h-11 flex-col items-end justify-center border-0 bg-transparent pr-1 pl-3 text-right"
              >
                <span className="text-14-5 font-bold text-ink">Not sure</span>
                <span className="text-11-5 font-medium text-muted">Leave as Unknown</span>
              </button>
            </div>
          </div>
        ) : (
          <CaughtUp
            reviewed={steps.length}
            percent={headlinePercent(
              scoreDay(
                occurrences.filter((o) => o.date === date),
                { startedBy: startedByFor(date, today, now.getHours() * 60 + now.getMinutes()) }),
            )}
            onDone={onDone}
          />
        )}
      </div>
    </BottomSheet>
  )
}

function CaughtUp({ reviewed, percent, onDone }: { reviewed: number; percent: number | null; onDone: () => void }) {
  return (
    <section
      aria-labelledby="caught-up-h"
      className="review-step mt-1 flex flex-col items-center gap-3 rounded-24 border border-line bg-card px-5 py-6 text-center"
    >
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
        {check(22)}
      </span>
      <h3 id="caught-up-h" className="m-0 font-display text-24 font-bold">
        All caught up
      </h3>
      <p className="m-0 text-14 font-medium text-muted">
        {reviewed === 1 ? 'You went through 1 block.' : `You went through ${reviewed} blocks.`}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-48 leading-none font-bold">{percent === null ? '–' : `${percent}%`}</span>
        <span className="text-15 font-bold text-primary">Day score</span>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-2 h-[54px] w-full rounded-27 border-0 bg-primary text-16 font-bold text-on-primary"
      >
        Done
      </button>
    </section>
  )
}
