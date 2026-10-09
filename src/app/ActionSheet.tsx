import { useId, useState } from 'react'
import { BottomSheet } from './BottomSheet'

export interface SheetAction {
  label: string
  /** Shown in red, for choices that remove something. */
  danger?: boolean
  /** Does the work. The menu stays open (and shows the problem) if this throws. */
  onSelect: () => Promise<void> | void
}

/**
 * An iPhone-style menu that slides up from the bottom: a short question, a few choices, and a
 * separate Cancel. Cancel, a swipe down, a tap on the dim area and Escape all close it.
 * `onClosed` is called once it has slid away: with the number of the choice that was made, or
 * null if it was cancelled.
 */
export function ActionSheet({
  title,
  message,
  actions,
  cancelLabel = 'Cancel',
  onClosed,
}: {
  title: string
  message?: string
  actions: SheetAction[]
  cancelLabel?: string
  onClosed: (chosen: number | null) => void
}) {
  const titleId = useId()
  const [closing, setClosing] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => {
    if (busy || closing) return
    setChosen(null)
    setClosing(true)
  }

  const choose = async (index: number) => {
    const action = actions[index]
    if (!action || busy || closing) return
    setBusy(true)
    setError(null)
    try {
      await action.onSelect()
      setChosen(index)
      setClosing(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <div className="px-5 pt-2 pb-3 text-center">
      <h2 id={titleId} className="m-0 font-sans text-15 font-bold break-words">
        {title}
      </h2>
      {message && <p className="m-0 mt-1 text-13 font-medium text-muted">{message}</p>}
    </div>
  )

  return (
    <BottomSheet
      fit="content"
      labelledBy={titleId}
      onRequestClose={cancel}
      closing={closing}
      onClosed={() => onClosed(chosen)}
      header={header}
    >
      <div className="flex flex-col gap-2 pt-1">
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            disabled={busy}
            onClick={() => void choose(index)}
            className={`h-[52px] rounded-16 border text-15 font-bold ${
              action.danger
                ? 'border-missed-text bg-missed-text text-on-primary'
                : 'border-line bg-card text-ink'
            }`}
          >
            {action.label}
          </button>
        ))}
        {error && (
          <p role="alert" className="m-0 text-center text-12-5 font-semibold text-missed-text">
            {error}
          </p>
        )}
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={cancel}
          className="mt-1 h-[52px] rounded-16 border border-line-strong bg-card text-15 font-bold text-primary"
        >
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
