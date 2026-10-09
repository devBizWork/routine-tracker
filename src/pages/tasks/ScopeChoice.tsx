import { useId } from 'react'
import type { Scope } from './draft'

/** The "Apply changes to" card of design/screens/AddTask.html: two radio choices. */
export function ScopeChoice({
  value,
  onChange,
  descriptions,
  dayDisabledText,
  note,
}: {
  value: Scope
  onChange: (scope: Scope) => void
  descriptions: Record<Scope, string>
  /** If set, "This day only" cannot be chosen (the routine does not run that day) and this says why. */
  dayDisabledText?: string
  /** A reminder under the choices, for example that some edits only apply to every day. */
  note?: string | null
}) {
  const headingId = useId()
  const options: { scope: Scope; label: string; text: string; disabled: boolean }[] = [
    { scope: 'day', label: 'This day only', text: dayDisabledText ?? descriptions.day, disabled: dayDisabledText !== undefined },
    { scope: 'future', label: 'This and future days', text: descriptions.future, disabled: false },
  ]

  return (
    <div className="flex flex-col gap-2 rounded-20 border border-line bg-card p-4">
      <span id={headingId} className="text-12 font-bold text-muted">
        Apply changes to
      </span>
      <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
        {options.map(({ scope, label, text, disabled }) => {
          const on = value === scope
          return (
            <button
              key={scope}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={disabled}
              onClick={() => !disabled && onChange(scope)}
              className={`box-border flex min-h-[62px] w-full items-start gap-3 rounded-16 p-3 text-left text-ink ${
                on ? 'border-2 border-primary bg-pill' : 'border border-line bg-card'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`mt-px box-border size-5 shrink-0 rounded-10 bg-card ${
                  on ? 'border-[6px] border-primary' : 'border-[1.5px] border-unknown-edge'
                }`}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-15 font-bold">{label}</span>
                <span className="text-12-5 font-medium text-muted">{text}</span>
              </span>
            </button>
          )
        })}
      </div>
      {note && <p className="m-0 text-12-5 font-semibold text-missed-text">{note}</p>}
    </div>
  )
}
