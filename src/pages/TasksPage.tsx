import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { PageHeader } from '../app/PageHeader'
import { listTasks, readSettings, today as todayKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { InboxRow, QuickAdd } from './tasks/InboxSection'
import { NewTaskSheet } from './tasks/NewTaskSheet'
import { TaskRow } from './tasks/TaskRow'

function Section({
  id,
  icon,
  title,
  count,
  caption,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  count: number
  caption: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="mx-4 mt-5 flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2
          id={id}
          className="m-0 flex items-center gap-1.5 font-sans text-12 font-extrabold tracking-[0.07em] text-muted"
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
            {icon}
          </svg>
          {title} · {count}
        </h2>
        <span className="text-12 font-medium text-muted">{caption}</span>
      </div>
      <div className="overflow-hidden rounded-22 border border-line bg-card">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 px-4 py-4 text-13 font-medium text-muted">{children}</p>
}

export function TasksPage() {
  const tasks = useLiveQuery(listTasks)
  const settings = useLiveQuery(readSettings)
  const timeFormat = settings?.timeFormat ?? '12h'
  const today = todayKey()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [soon, setSoon] = useState(0)
  const comingSoon = () => setSoon((n) => n + 1)
  const hideSoon = useCallback(() => setSoon(0), [])

  const { inbox, routines, oneOffs } = useMemo(() => {
    const all = tasks ?? []
    return {
      inbox: all.filter((t) => t.startTime === null),
      routines: all
        .filter((t) => t.startTime !== null && t.repeat.kind !== 'once')
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title)),
      oneOffs: all
        .filter((t) => t.startTime !== null && t.repeat.kind === 'once')
        .sort(
          (a, b) =>
            (a.date ?? '').localeCompare(b.date ?? '') ||
            (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
            a.title.localeCompare(b.title),
        ),
    }
  }, [tasks])

  const total = tasks?.length ?? 0

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Tasks"
        trailing={
          tasks && (
            <span className="pb-1.5 text-13 font-semibold text-muted">
              {total} {total === 1 ? 'task' : 'tasks'}
            </span>
          )
        }
      />

      {tasks && (
        <>
          <Section
            id="inbox-h"
            title="INBOX"
            count={inbox.length}
            caption="Not on the timeline yet"
            icon={
              <>
                <path d="M3.5 13h5l1.5 2.5h4l1.5-2.5h5" />
                <path d="M6 5h12l2.5 8v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5z" />
              </>
            }
          >
            {inbox.map((task) => (
              <InboxRow key={task.id} task={task} onSchedule={comingSoon} />
            ))}
            <QuickAdd />
          </Section>

          <Section
            id="routines-h"
            title="ROUTINES"
            count={routines.length}
            caption="Repeat on their own"
            icon={
              <>
                <path d="M17 3l3 3-3 3" />
                <path d="M4 11.5V10a4 4 0 0 1 4-4h12" />
                <path d="M7 21l-3-3 3-3" />
                <path d="M20 12.5V14a4 4 0 0 1-4 4H4" />
              </>
            }
          >
            {routines.length === 0 ? (
              <Empty>Nothing repeats yet. Tap + and choose Daily, Weekdays or Custom.</Empty>
            ) : (
              <div className="divide-y divide-line">
                {routines.map((task) => (
                  <TaskRow key={task.id} task={task} timeFormat={timeFormat} today={today} onOpen={comingSoon} />
                ))}
              </div>
            )}
          </Section>

          <Section
            id="oneoff-h"
            title="ONE-OFF"
            count={oneOffs.length}
            caption="Swiping: coming soon"
            icon={
              <>
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </>
            }
          >
            {oneOffs.length === 0 ? (
              <Empty>No one-off tasks. Tap + and leave Repeat on Once.</Empty>
            ) : (
              <div className="divide-y divide-line">
                {oneOffs.map((task) => (
                  <TaskRow key={task.id} task={task} timeFormat={timeFormat} today={today} onOpen={comingSoon} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* The round + button floats at the bottom right while the list scrolls. */}
      <div className="pointer-events-none sticky bottom-[18px] mt-auto flex justify-end px-5 pt-6">
        <button
          type="button"
          aria-label="Add task"
          onClick={() => setSheetOpen(true)}
          className="pointer-events-auto flex size-15 items-center justify-center rounded-30 border-0 bg-primary text-on-primary shadow-fab"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="h-4" />

      {sheetOpen && (
        <NewTaskSheet
          tasks={tasks ?? []}
          timeFormat={timeFormat}
          today={today}
          onClosed={() => setSheetOpen(false)}
        />
      )}

      <ComingSoonToast tap={soon} onDone={hideSoon} />
    </div>
  )
}
