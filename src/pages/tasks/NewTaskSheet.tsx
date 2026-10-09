import { useId, useMemo, useState, type ReactNode } from 'react'
import { BottomSheet } from '../../app/BottomSheet'
import {
  CATEGORIES,
  categoryColor,
  createTask,
  findOverlaps,
  formatDateLabel,
  formatDuration,
  formatMinutesAsTime,
  formatTime,
  isDateKey,
  overlapMessage,
  type RepeatKind,
  type Task,
  type TimeFormat,
} from '../../data'
import {
  DURATION_OPTIONS,
  QUICK_DURATIONS,
  canSave,
  daysOf,
  endMinutes,
  endValue,
  initialDraft,
  isDirty,
  repeatProblem,
  setDuration,
  setEnd,
  setEndMode,
  setKind,
  setStart,
  timeProblem,
  toNewTask,
  toggleDay,
  type Draft,
} from './draft'
import { DateBox, SelectBox, TimeBox } from './fields'

const REPEAT_CHOICES: { kind: RepeatKind; label: string }[] = [
  { kind: 'once', label: 'Once' },
  { kind: 'daily', label: 'Daily' },
  { kind: 'weekdays', label: 'Weekdays' },
  { kind: 'custom', label: 'Custom' },
]

// Monday first, like the design. Value 0 is Sunday.
const WEEK: { day: number; letter: string; name: string }[] = [
  { day: 1, letter: 'M', name: 'Monday' },
  { day: 2, letter: 'T', name: 'Tuesday' },
  { day: 3, letter: 'W', name: 'Wednesday' },
  { day: 4, letter: 'T', name: 'Thursday' },
  { day: 5, letter: 'F', name: 'Friday' },
  { day: 6, letter: 'S', name: 'Saturday' },
  { day: 0, letter: 'S', name: 'Sunday' },
]

const DURATION_CHOICES = DURATION_OPTIONS.map((value) => ({ value, label: formatDuration(value) }))

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-20 border border-line bg-card ${className}`}>{children}</div>
}

function Caption({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <span id={id} className="text-12 font-bold text-muted">
      {children}
    </span>
  )
}

function Problem({ children, tone }: { children: ReactNode; tone: 'error' | 'warning' }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className="m-0 flex items-start gap-1.5 text-12-5 font-semibold text-missed-text"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-px shrink-0"
      >
        <path d="M12 4 2.5 20h19z" />
        <path d="M12 10v4.5M12 17.5v.01" />
      </svg>
      {children}
    </p>
  )
}

export function NewTaskSheet({
  tasks,
  timeFormat,
  today,
  onClosed,
}: {
  /** Everything already planned, to warn about overlaps. */
  tasks: readonly Task[]
  timeFormat: TimeFormat
  today: string
  onClosed: () => void
}) {
  const titleId = useId()
  const [initial] = useState(() => initialDraft(today))
  const [draft, setDraft] = useState<Draft>(initial)
  const [closing, setClosing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const update = (change: (d: Draft) => Draft) => setDraft(change)

  const dirty = isDirty(draft, initial)
  const timeIssue = timeProblem(draft)
  const repeatIssue = repeatProblem(draft)
  const savable = canSave(draft) && !saving

  const overlap = useMemo(() => {
    if (draft.start === '' || timeProblem(draft) !== null || repeatProblem(draft) !== null) return null
    return overlapMessage(
      findOverlaps(
        {
          startTime: draft.start,
          plannedMinutes: draft.duration,
          repeat: { kind: draft.kind, days: daysOf(draft) },
          date: draft.kind === 'once' && isDateKey(draft.date) ? draft.date : null,
        },
        tasks,
        today,
      ),
    )
  }, [draft, tasks, today])

  // Cancel, swipe down and a tap on the backdrop all come here.
  const requestClose = () => {
    if (closing || saving) return
    if (confirming) setConfirming(false)
    else if (dirty) setConfirming(true)
    else setClosing(true)
  }

  const save = async () => {
    if (!savable) return
    setSaving(true)
    setSaveError(null)
    try {
      await createTask(toNewTask(draft))
      setClosing(true)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this block.')
    } finally {
      setSaving(false)
    }
  }

  const end = endMinutes(draft)
  const durationCaption =
    end !== null && timeProblem(draft) === null ? `Duration · ends ${formatMinutesAsTime(end, timeFormat)}` : 'Duration'
  const endText = endValue(draft)

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 pb-3">
      <button
        type="button"
        onClick={requestClose}
        className="h-11 border-0 bg-transparent pr-2 pl-1 text-15 font-semibold text-primary"
      >
        Cancel
      </button>
      <h2 id={titleId} className="m-0 font-sans text-17 font-bold">
        New block
      </h2>
      <button
        type="button"
        disabled={!savable}
        onClick={() => void save()}
        className="h-11 rounded-full border-0 bg-primary px-[18px] text-15 font-bold text-on-primary disabled:bg-line disabled:text-muted"
      >
        Save
      </button>
    </div>
  )

  const overlay = confirming && (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-scrim px-6"
      onClick={() => setConfirming(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-discard`}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[320px] flex-col gap-1 rounded-22 bg-card p-5"
      >
        <h3 id={`${titleId}-discard`} className="m-0 font-sans text-17 font-bold">
          Discard this block?
        </h3>
        <p className="m-0 text-14 font-medium text-muted">What you entered will be lost.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(false)}
            className="h-11 rounded-full border-0 bg-pill text-14 font-bold text-primary"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              setClosing(true)
            }}
            className="h-11 rounded-full border border-missed bg-card text-14 font-bold text-missed-text"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <BottomSheet
      labelledBy={titleId}
      onRequestClose={requestClose}
      closing={closing}
      onClosed={onClosed}
      header={header}
      overlay={overlay}
      blocked={confirming}
    >
      <div className="flex flex-col gap-3">
        {/* The whole card is the label, so tapping anywhere in it focuses the field. */}
        <label className="flex flex-col gap-0.5 rounded-20 border border-line bg-card px-4 py-3 focus-within:border-primary">
          <Caption>Title</Caption>
          <input
            type="text"
            autoFocus
            autoComplete="off"
            enterKeyHint="next"
            value={draft.title}
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
            className="h-[30px] w-full border-0 bg-transparent p-0 text-20 font-bold text-ink outline-none"
          />
        </label>

        <Card className="flex flex-col gap-2.5 p-4">
          <div className="flex h-5 items-center justify-between">
            <Caption>When</Caption>
            <button
              type="button"
              onClick={() => update((d) => setEndMode(d, !d.endMode))}
              className="-mx-2 -my-3 h-11 border-0 bg-transparent px-2 text-13 font-bold text-primary"
            >
              {draft.endMode ? 'Set duration instead' : 'Set end time instead'}
            </button>
          </div>

          {/* Start is short ("9:30 am"); Duration gets the wider share so "Duration · ends
              8:28 pm" fits on one line. */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
            <TimeBox
              caption="Start"
              display={draft.start === '' ? 'Choose' : formatTime(draft.start, timeFormat)}
              value={draft.start}
              ariaLabel="Start time"
              onChange={(v) => update((d) => setStart(d, v))}
            />
            {draft.endMode ? (
              <TimeBox
                caption={`End · ${formatDuration(draft.duration)}`}
                display={endText === '' ? 'Choose' : formatTime(endText, timeFormat)}
                value={endText}
                ariaLabel="End time"
                disabled={draft.start === ''}
                onChange={(v) => update((d) => setEnd(d, v))}
              />
            ) : (
              <SelectBox
                caption={durationCaption}
                display={formatDuration(draft.duration)}
                value={draft.duration}
                options={DURATION_CHOICES}
                ariaLabel="Duration"
                onChange={(v) => update((d) => setDuration(d, v))}
              />
            )}
          </div>

          <div role="group" aria-label="Quick durations" className="grid grid-cols-6 gap-1.5">
            {QUICK_DURATIONS.map((minutes) => {
              const on = draft.duration === minutes
              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update((d) => setDuration(d, minutes))}
                  className={`h-11 rounded-12 border p-0 text-13 ${
                    on
                      ? 'border-primary bg-primary font-bold text-on-primary'
                      : 'border-line bg-card font-semibold text-ink'
                  }`}
                >
                  {minutes}
                </button>
              )
            })}
          </div>

          {timeIssue && <Problem tone="error">{timeIssue}</Problem>}
          {!timeIssue && overlap && <Problem tone="warning">{overlap}</Problem>}
        </Card>

        <Card className="flex flex-col gap-2.5 p-4">
          <Caption>Repeat</Caption>
          <div role="group" aria-label="Repeat" className="grid grid-cols-4 gap-0.5 rounded-14 bg-line p-[3px]">
            {REPEAT_CHOICES.map((choice) => {
              const on = draft.kind === choice.kind
              return (
                <button
                  key={choice.kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update((d) => setKind(d, choice.kind, today))}
                  className={`h-11 rounded-11 border-0 p-0 text-13 ${
                    on
                      ? 'bg-card font-bold text-primary shadow-segment'
                      : 'bg-transparent font-semibold text-ink'
                  }`}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>

          {draft.kind === 'once' ? (
            <DateBox
              caption="Date"
              display={isDateKey(draft.date) ? formatDateLabel(draft.date, today) : 'Choose'}
              value={draft.date}
              ariaLabel="Date"
              onChange={(v) => update((d) => ({ ...d, date: v }))}
            />
          ) : (
            <div role="group" aria-label="Days" className="flex justify-between">
              {WEEK.map(({ day, letter, name }) => {
                const on = daysOf(draft).includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={name}
                    onClick={() => update((d) => toggleDay(d, day))}
                    className={`size-11 rounded-full border-0 p-0 text-13 ${
                      on ? 'bg-primary font-bold text-on-primary' : 'bg-ground font-semibold text-ink'
                    }`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          )}
          {repeatIssue && <Problem tone="error">{repeatIssue}</Problem>}
        </Card>

        <Card className="flex flex-col gap-2.5 p-4">
          <Caption id={`${titleId}-category`}>Category</Caption>
          <div role="group" aria-labelledby={`${titleId}-category`} className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((category) => {
              const on = draft.color === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update((d) => ({ ...d, color: category.id }))}
                  style={{ background: categoryColor(category.id) }}
                  className={`flex h-11 items-center justify-center gap-1 rounded-12 border-2 px-1 text-13 text-ink ${
                    on ? 'border-primary font-bold' : 'border-transparent font-semibold'
                  }`}
                >
                  {on && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                  {category.name}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="flex min-h-[58px] items-center gap-2.5 py-1 pr-3 pl-4">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 text-primary"
            >
              <path d="M9 18V6l10-2v12" />
              <circle cx="6.5" cy="18" r="2.5" />
              <circle cx="16.5" cy="16" r="2.5" />
            </svg>
            <span className="flex-1 text-15 font-semibold whitespace-nowrap">Chime for this task</span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 py-1">
              <span className="text-14 font-medium text-muted">App default</span>
              <span className="rounded-9 bg-ground px-2 py-0.5 text-10-5 font-bold text-muted">Coming soon</span>
            </span>
          </div>
        </Card>

        <Card className="flex flex-col gap-1.5 p-4">
          <label htmlFor={`${titleId}-notes`}>
            <Caption>Notes</Caption>
          </label>
          <textarea
            id={`${titleId}-notes`}
            rows={2}
            value={draft.notes}
            onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
            className="min-h-[52px] w-full resize-none border-0 bg-transparent p-0 text-16 leading-[1.45] font-medium text-ink outline-none"
          />
        </Card>

        {saveError && <Problem tone="error">{saveError}</Problem>}
      </div>
    </BottomSheet>
  )
}
