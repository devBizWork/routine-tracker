import { useId, useState, type KeyboardEvent } from 'react'
import { ActionSheet } from '../../app/ActionSheet'
import { BottomSheet } from '../../app/BottomSheet'
import { createTask } from '../../data'

/**
 * A small sheet for jotting a to-do that has no time yet ("Or jot a to-do in the inbox" on the
 * first-run Today screen). It opens on the spot, so the phone's keyboard comes up with it, and
 * Add puts the to-do in the Inbox on the Tasks tab. `onClosed(true)` says a to-do was added.
 */
export function TodoSheet({ onClosed }: { onClosed: (added: boolean) => void }) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [closing, setClosing] = useState(false)
  const [added, setAdded] = useState(false)
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAdd = title.trim() !== '' && !saving

  // Cancel, swipe down, a tap on the backdrop and Escape all come here.
  const requestClose = () => {
    if (closing || saving) return
    if (asking) setAsking(false)
    else if (title.trim() !== '') setAsking(true)
    else setClosing(true)
  }

  const add = async () => {
    if (!canAdd) return
    setSaving(true)
    setError(null)
    try {
      await createTask({ title: title.trim() })
      setAdded(true)
      setClosing(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not add that to-do.')
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Ignore the Return that confirms a word while typing in languages with composition.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    void add()
  }

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
        New to-do
      </h2>
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => void add()}
        className="h-11 rounded-full border-0 bg-primary px-[18px] text-15 font-bold text-on-primary disabled:bg-line disabled:text-muted"
      >
        Add
      </button>
    </div>
  )

  return (
    <BottomSheet
      fit="content"
      labelledBy={titleId}
      onRequestClose={requestClose}
      closing={closing}
      onClosed={() => onClosed(added)}
      header={header}
      overlay={
        asking && (
          <ActionSheet
            title="Discard this to-do?"
            message="What you typed will be lost."
            actions={[{ label: 'Discard', danger: true, onSelect: () => undefined }]}
            cancelLabel="Keep editing"
            onClosed={(chosen) => {
              setAsking(false)
              if (chosen !== null) setClosing(true)
            }}
          />
        )
      }
      blocked={asking}
    >
      <div className="flex flex-col gap-2">
        {/* The whole card is the label, so tapping anywhere in it focuses the field. */}
        <label className="flex flex-col gap-0.5 rounded-20 border border-line bg-card px-4 py-3 focus-within:border-primary">
          <span className="text-12 font-bold text-muted">To-do</span>
          <input
            type="text"
            autoFocus
            autoComplete="off"
            enterKeyHint="done"
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-[30px] w-full border-0 bg-transparent p-0 text-20 font-bold text-ink outline-none placeholder:text-muted"
          />
        </label>
        <p className="m-0 px-1 text-12-5 font-medium text-muted">
          It goes in your Inbox on the Tasks tab. Give it a time later with Schedule.
        </p>
        {error && (
          <p role="alert" className="m-0 px-1 text-12-5 font-semibold text-missed-text">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  )
}
