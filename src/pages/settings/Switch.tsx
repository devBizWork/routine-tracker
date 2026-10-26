/** An on/off switch as in design/screens/Settings.html (52 by 32, inside a 44 px tap area). */
export function Switch({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="-my-1.5 flex h-11 w-[52px] shrink-0 items-center border-0 bg-transparent p-0 disabled:opacity-45"
    >
      <span
        className={`flex h-8 w-[52px] rounded-16 p-[3px] transition-colors ${
          checked ? 'justify-end bg-primary' : 'justify-start bg-line-strong'
        }`}
      >
        <span className="size-[26px] rounded-full bg-card shadow-segment" />
      </span>
    </button>
  )
}
