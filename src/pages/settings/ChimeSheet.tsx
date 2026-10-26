import { useId, useState } from 'react'
import { BottomSheet } from '../../app/BottomSheet'
import { previewSound } from '../../sound/audio'
import type { ChimeChoice } from './chimeChoices'

/**
 * The chime picker: a list of chimes; tapping one plays it and selects it (with a check), and Done
 * closes. Tapping also unlocks audio on iPhone.
 */
export function ChimeSheet({
  title,
  choices,
  value,
  onChange,
  onClosed,
}: {
  title: string
  choices: readonly ChimeChoice[]
  value: string
  onChange: (value: string) => void
  onClosed: () => void
}) {
  const titleId = useId()
  const [closing, setClosing] = useState(false)

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 pb-3">
      <span className="w-[60px]" />
      <h2 id={titleId} className="m-0 font-sans text-17 font-bold">
        {title}
      </h2>
      <button
        type="button"
        onClick={() => setClosing(true)}
        className="h-11 w-[60px] border-0 bg-transparent text-right text-15 font-bold text-primary"
      >
        Done
      </button>
    </div>
  )

  return (
    <BottomSheet fit="content" labelledBy={titleId} onRequestClose={() => setClosing(true)} closing={closing} onClosed={onClosed} header={header}>
      <ul role="radiogroup" aria-labelledby={titleId} className="m-0 list-none overflow-hidden rounded-22 border border-line bg-card p-0">
        {choices.map((c) => {
          const on = c.value === value
          return (
            <li key={c.value} className="border-t border-line first:border-t-0">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  onChange(c.value)
                  if (c.preview) void previewSound(c.preview)
                }}
                className="flex min-h-[58px] w-full items-center gap-3 border-0 bg-transparent px-4 py-2 text-left text-ink"
              >
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-15 font-semibold">{c.name}</span>
                  {c.description && <span className="text-12-5 font-medium text-muted">{c.description}</span>}
                </span>
                {on && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 text-primary"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="m-0 mt-2 px-2 text-12-5 font-medium text-muted">Tap a chime to hear it.</p>
    </BottomSheet>
  )
}
