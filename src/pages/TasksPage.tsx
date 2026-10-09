import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ActionSheet } from '../app/ActionSheet'
import { ComingSoonToast } from '../app/ComingSoonToast'
import { PageHeader } from '../app/PageHeader'
import {
  createTask,
  deleteTaskFromDate,
  hasEnded,
  listTasks,
  readSettings,
  taskLogCount,
  today as todayKey,
  type Task,
} from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { deleteCopy, type DeleteCopy } from './tasks/deleteCopy'
import { InboxRow, QuickAdd } from './tasks/InboxSection'
import { TaskRow } from './tasks/TaskRow'
import { todoCopy } from './tasks/draft'
import { TaskSheet, type SheetMode } from './tasks/TaskSheet'

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
  const allTasks = useLiveQuery(listTasks)
  const settings = useLiveQuery(readSettings)
  const timeFormat = settings?.timeFormat ?? '12h'
  const today = todayKey()

  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const [openRow, setOpenRow] = useState<string | null>(null) // the row that is swiped open
  const [deleting, setDeleting] = useState<{ task: Task; copy: DeleteCopy } | null>(null)
  // A short message at the bottom (used when something could not be saved). tap 0 = hidden.
  const [notice, setNotice] = useState({ tap: 0, message: '' })
  const hideNotice = useCallback(() => setNotice((n) => ({ ...n, tap: 0 })), [])

  // A tap anywhere except the open row closes it.
  useEffect(() => {
    if (openRow === null) return
    const closeUnlessOpenRow = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-swipe-row][data-open="true"]')) setOpenRow(null)
    }
    document.addEventListener('pointerdown', closeUnlessOpenRow, true)
    return () => document.removeEventListener('pointerdown', closeUnlessOpenRow, true)
  }, [openRow])

  const openSheet = (mode: SheetMode) => {
    setOpenRow(null)
    setSheet(mode)
  }

  const askDelete = async (task: Task) => {
    setOpenRow(null)
    setDeleting({ task, copy: deleteCopy(task, await taskLogCount(task.id), today) })
  }

  const duplicateTodo = async (task: Task) => {
    setOpenRow(null)
    try {
      await createTask(todoCopy(task))
    } catch {
      setNotice((n) => ({ tap: n.tap + 1, message: 'Could not copy that to-do. Please try again.' }))
    }
  }

  const rowProps = (task: Task) => ({
    open: openRow === task.id,
    onOpenChange: (open: boolean) => setOpenRow(open ? task.id : null),
    onDuplicate: () => openSheet({ kind: 'duplicate', task }),
    onDelete: () => void askDelete(task),
  })

  // Routines that were deleted or replaced by an edited copy keep their row (so earlier days
  // stay intact) but are finished, so they are not listed.
  const tasks = (allTasks ?? []).filter((t) => !hasEnded(t, today))

  const inbox = tasks.filter((t) => t.startTime === null)
  const routines = tasks
    .filter((t) => t.startTime !== null && t.repeat.kind !== 'once')
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title))
  const oneOffs = tasks
    .filter((t) => t.startTime !== null && t.repeat.kind === 'once')
    .sort(
      (a, b) =>
        (a.date ?? '').localeCompare(b.date ?? '') ||
        (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
        a.title.localeCompare(b.title),
    )

  const total = tasks.length

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Tasks"
        trailing={
          allTasks && (
            <span className="pb-1.5 text-13 font-semibold text-muted">
              {total} {total === 1 ? 'task' : 'tasks'}
            </span>
          )
        }
      />

      {allTasks && (
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
              <InboxRow
                key={task.id}
                task={task}
                {...rowProps(task)}
                // Duplicating a to-do just adds another one to the Inbox.
                onDuplicate={() => void duplicateTodo(task)}
                onSchedule={() => openSheet({ kind: 'schedule', task })}
              />
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
                  <TaskRow
                    key={task.id}
                    task={task}
                    timeFormat={timeFormat}
                    today={today}
                    {...rowProps(task)}
                    onEdit={() => openSheet({ kind: 'edit', task })}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            id="oneoff-h"
            title="ONE-OFF"
            count={oneOffs.length}
            caption="Swipe a row for more"
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
                  <TaskRow
                    key={task.id}
                    task={task}
                    timeFormat={timeFormat}
                    today={today}
                    {...rowProps(task)}
                    onEdit={() => openSheet({ kind: 'edit', task })}
                  />
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
          onClick={() => openSheet({ kind: 'new' })}
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

      {sheet && (
        <TaskSheet
          // A different sheet (for example Duplicate opened from Edit) starts fresh.
          key={`${sheet.kind}-${'task' in sheet ? sheet.task.id : 'new'}`}
          mode={sheet}
          tasks={tasks}
          timeFormat={timeFormat}
          today={today}
          onDuplicate={(task) => openSheet({ kind: 'duplicate', task })}
          onClosed={() => setSheet(null)}
        />
      )}

      {deleting && (
        <ActionSheet
          title={deleting.copy.title}
          message={deleting.copy.message}
          actions={[
            {
              label: deleting.copy.confirm,
              danger: true,
              onSelect: () => deleteTaskFromDate(deleting.task.id),
            },
          ]}
          onClosed={() => setDeleting(null)}
        />
      )}

      <ComingSoonToast tap={notice.tap} onDone={hideNotice} message={notice.message} />
    </div>
  )
}
