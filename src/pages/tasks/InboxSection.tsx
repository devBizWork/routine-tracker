import { useState, type KeyboardEvent } from 'react'
import { createTask, type Task } from '../../data'

/** The row at the bottom of the Inbox: type a to-do, press Return, it joins the Inbox. */
export function QuickAdd() {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Ignore the Return that confirms a word while typing in languages with composition.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    const title = text.trim()
    if (title === '') return // an empty line does nothing
    setText('')
    setError(null)
    createTask({ title }).catch((failure: unknown) => {
      setText(title) // put it back so nothing typed is lost
      setError(failure instanceof Error ? failure.message : 'Could not add that to-do.')
    })
  }

  return (
    <div className="border-t border-line px-4 py-1 text-muted">
      <div className="flex min-h-[52px] items-center gap-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <label htmlFor="quick-add" className="sr-only">
          Add a to-do to the inbox
        </label>
        <input
          id="quick-add"
          type="text"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="Add a to-do without a time"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-16 font-medium text-ink outline-none placeholder:text-muted"
        />
      </div>
      {error && (
        <p role="alert" className="m-0 pb-2 text-12-5 font-semibold text-missed-text">
          {error}
        </p>
      )}
    </div>
  )
}

/** One to-do waiting in the Inbox, with its Schedule button. */
export function InboxRow({ task, onSchedule }: { task: Task; onSchedule: () => void }) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 border-t border-line py-1 pr-1.5 pl-4 first:border-t-0">
      <span
        aria-hidden="true"
        className="box-border size-[18px] shrink-0 rounded-6 border-[1.5px] border-dashed border-unknown-edge"
      />
      <span className="min-w-0 flex-1 py-2 text-15 font-semibold break-words">{task.title}</span>
      <button
        type="button"
        aria-label={`Schedule ${task.title}`}
        onClick={onSchedule}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-22 border-0 bg-pill pr-3.5 pl-3 text-13 font-bold text-primary"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
        </svg>
        Schedule
      </button>
    </div>
  )
}
