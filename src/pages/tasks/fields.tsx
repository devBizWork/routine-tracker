import type { MouseEvent, ReactNode } from 'react'

// Time, date and duration fields drawn like the designs, but built on the phone's own
// pickers: a real <input type="time"> / <input type="date"> / <select> sits invisibly on
// top of the drawn box, so tapping it opens the native iOS wheel while the text shown
// follows the 12/24-hour setting and the design.

const box =
  'relative flex h-[58px] w-full flex-col items-start justify-center gap-0.5 rounded-14 bg-ground px-3.5 text-left text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary has-[:disabled]:opacity-50'
// 16px so iOS does not zoom in when the picker opens.
const invisibleInput =
  'absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-16 opacity-0 disabled:cursor-default'

function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    // Some browsers only allow this from certain taps; the field still works by typing.
  }
}

function Face({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="text-12 font-semibold text-muted">
        {caption}
      </span>
      <span aria-hidden="true" className="text-17 font-bold">
        {children}
      </span>
    </>
  )
}

export function TimeBox({
  caption,
  display,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  caption: string
  display: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <label className={box}>
      <Face caption={caption}>{display}</Face>
      <input
        type="time"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className={invisibleInput}
      />
    </label>
  )
}

export function DateBox({
  caption,
  display,
  value,
  onChange,
  ariaLabel,
}: {
  caption: string
  display: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}) {
  return (
    <label className={box}>
      <Face caption={caption}>{display}</Face>
      <input
        type="date"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className={invisibleInput}
      />
    </label>
  )
}

export function SelectBox({
  caption,
  display,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  caption: string
  display: string
  value: number
  options: readonly { value: number; label: string }[]
  onChange: (value: number) => void
  ariaLabel: string
}) {
  return (
    <label className={box}>
      <Face caption={caption}>{display}</Face>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className={invisibleInput}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
