import { useCallback, useState, type ReactNode } from 'react'
import {
  counts,
  eraseAllData,
  getDay,
  getStoragePersistence,
  isDateKey,
  loadSampleData,
  minutesToTime,
  peekDay,
  timeToMinutes,
  today,
  type Occurrence,
} from '../../data'
import { useLiveQuery } from '../../data/useLiveQuery'

// A plain tool for checking the data while the real screens are built. It is hidden
// until "Version" is tapped 5 times (see SettingsPage).

const button =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-22 px-4 text-13-5 font-extrabold'
const primaryButton = `${button} border-0 bg-pill text-primary`
const quietButton = `${button} border border-line-strong bg-card text-ink`
const dangerButton = `${button} border border-missed bg-card text-missed-text`
const dangerSolid = `${button} border-0 bg-missed-text text-on-primary`

function Card({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-22 border border-line bg-card">{children}</div>
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-15 font-semibold">{label}</span>
        {hint && <span className="text-12-5 font-medium text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

function StatusChip({ status }: { status: Occurrence['status'] }) {
  const style =
    status === 'done'
      ? 'bg-pill text-primary'
      : status === 'skipped'
        ? 'bg-cat-meetings text-ink'
        : 'border border-line-strong bg-ground text-muted'
  return <span className={`rounded-9 px-2 py-0.5 text-10-5 font-bold ${style}`}>{status}</span>
}

function range(start: string, minutes: number): string {
  return `${start}–${minutesToTime(timeToMinutes(start) + minutes)}`
}

function Inspector() {
  const [date, setDate] = useState(today)
  const valid = isDateKey(date)
  const query = useCallback(() => (valid ? peekDay(date) : Promise.resolve(null)), [date, valid])
  const day = useLiveQuery(query)

  return (
    <Card>
      <div className="flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-15 font-semibold">Day inspector</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full rounded-14 border-0 bg-ground px-3 text-16 font-bold text-ink"
          />
        </label>

        {!valid && <p className="text-13 text-muted">Pick a date to see its blocks.</p>}

        {day && !day.created && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-13 font-medium text-muted">
              Not created yet. A day is created the first time the app opens it.
            </p>
            <button type="button" className={primaryButton} onClick={() => void getDay(date)}>
              Create this day now
            </button>
          </div>
        )}

        {day?.created && day.occurrences.length === 0 && (
          <p className="text-13 font-medium text-muted">Created, with no blocks on this day.</p>
        )}

        {day?.created && day.occurrences.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {day.occurrences.map((o) => (
              <li
                key={o.id}
                className="flex items-start gap-3 rounded-14 px-3 py-2 text-ink"
                style={{ background: `var(--color-cat-${o.color})` }}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-14 font-bold">{o.title}</span>
                  <span className="text-12 font-medium">
                    Planned {range(o.plannedStart, o.plannedMinutes)} ({o.plannedMinutes} min)
                  </span>
                  {o.actualStart && o.actualEnd && (
                    <span className="text-12 font-medium">
                      Actual {o.actualStart}–{o.actualEnd}
                    </span>
                  )}
                  {o.timerStartedAt !== null && (
                    <span className="text-12 font-medium">Timer running</span>
                  )}
                  {o.note && <span className="text-12 font-medium">“{o.note}”</span>}
                </span>
                <StatusChip status={o.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

type Pending = 'sample' | 'erase' | null

function Tools() {
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true)
    setPending(null)
    try {
      await action()
      setMessage(done)
    } catch (error) {
      setMessage(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const startSample = async () => {
    const c = await counts()
    if (c.tasks + c.occurrences > 0) setPending('sample')
    else await run(loadSampleData, 'Loaded 14 tasks and 7 logged days.')
  }

  return (
    <Card>
      <Row label="Load sample data" hint="14 tasks and the last 7 days, logged">
        <button type="button" className={primaryButton} disabled={busy} onClick={() => void startSample()}>
          Load
        </button>
      </Row>
      {pending === 'sample' && (
        <Confirm
          text="This replaces all current tasks and blocks (settings stay)."
          confirmLabel="Replace"
          onCancel={() => setPending(null)}
          onConfirm={() => void run(loadSampleData, 'Loaded 14 tasks and 7 logged days.')}
        />
      )}

      <Row label="Erase all data" hint="Tasks, blocks and settings on this device">
        <button type="button" className={dangerButton} disabled={busy} onClick={() => setPending('erase')}>
          Erase…
        </button>
      </Row>
      {pending === 'erase' && (
        <Confirm
          text="Erase everything? This cannot be undone."
          confirmLabel="Erase everything"
          onCancel={() => setPending(null)}
          onConfirm={() => void run(eraseAllData, 'All data erased.')}
        />
      )}

      <p className="m-0 px-4 pb-3 text-12-5 font-medium text-muted empty:hidden" role="status">
        {message}
      </p>
    </Card>
  )
}

function Confirm({
  text,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  text: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div role="alert" className="flex flex-col gap-3 border-t border-line bg-cat-meetings px-4 py-3">
      <p className="m-0 text-14 font-semibold text-ink">{text}</p>
      <div className="flex gap-2">
        <button type="button" className={quietButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={dangerSolid} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

function StoredData() {
  const totals = useLiveQuery(counts)
  const persistence = useLiveQuery(getStoragePersistence)

  const storage = !persistence
    ? 'Checking…'
    : !persistence.supported
      ? 'Not supported'
      : persistence.persisted
        ? 'Persistent'
        : 'Not persistent'

  return (
    <Card>
      <div>
        <Row label="Tasks">
          <span className="text-15 font-bold">{totals?.tasks ?? '–'}</span>
        </Row>
        <Row label="Blocks" hint="One task on one date">
          <span className="text-15 font-bold">{totals?.occurrences ?? '–'}</span>
        </Row>
        <Row label="Days created">
          <span className="text-15 font-bold">{totals?.days ?? '–'}</span>
        </Row>
        <Row
          label="Storage"
          hint={
            persistence?.supported && !persistence.persisted
              ? 'The browser may clear data if the phone runs low on space'
              : persistence
                ? `Checked ${new Date(persistence.checkedAt).toLocaleString()}`
                : undefined
          }
        >
          <span className="text-15 font-bold">{storage}</span>
        </Row>
      </div>
    </Card>
  )
}

export function DeveloperSection() {
  return (
    <section aria-labelledby="dev-h" className="mx-4 mt-[22px] flex flex-col gap-2">
      <h2
        id="dev-h"
        className="m-0 flex items-center gap-1.5 px-1 font-sans text-12 font-extrabold tracking-[0.07em] text-muted"
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
        >
          <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
        </svg>
        DEVELOPER
      </h2>
      <StoredData />
      <Inspector />
      <Tools />
    </section>
  )
}
