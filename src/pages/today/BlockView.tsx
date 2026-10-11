import { categoryColor, formatDuration, formatRange, type TimeFormat } from '../../data'
import { TWO_LINES_FROM, type BlockLook, type PlacedBlock } from './plan'

/** The smallest comfortable tap target, in pixels. */
const MIN_TAP = 44

// One block on the timeline, drawn from design/screens/Main.html and States.html. The whole
// block is a button, and so is the round button at its right; both say "Coming soon" until
// logging arrives in Step 6.

const icon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

function QuickButton({ look, title, onTap }: { look: BlockLook; title: string; onTap: () => void }) {
  const label =
    look === 'unknown'
      ? `${title} was not logged. Log it now`
      : look === 'done'
        ? `${title} done. Edit log`
        : look === 'skipped'
          ? `${title} skipped. Edit log`
          : `Start timer for ${title}`

  let face
  if (look === 'done') {
    face = (
      <span className="flex size-[30px] items-center justify-center rounded-15 bg-primary text-on-primary">
        <svg {...icon} width="15" height="15" strokeWidth="2.8">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    )
  } else if (look === 'skipped') {
    face = (
      <span className="flex size-7 items-center justify-center rounded-14 bg-card text-muted">
        <svg {...icon} width="15" height="15" strokeWidth="2.4">
          <circle cx="12" cy="12" r="8" />
          <path d="M6.5 6.5l11 11" />
        </svg>
      </span>
    )
  } else if (look === 'unknown') {
    face = (
      <span className="box-border flex size-7 items-center justify-center rounded-14 border-[1.5px] border-dashed border-muted bg-card text-muted">
        <svg {...icon} width="15" height="15" strokeWidth="2.4">
          <path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.6" />
          <path d="M12 17.2h.01" />
        </svg>
      </span>
    )
  } else if (look === 'current') {
    face = (
      <span className="flex size-9 items-center justify-center rounded-18 bg-primary text-on-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </span>
    )
  } else {
    face = (
      <span className="flex size-7 items-center justify-center rounded-14 bg-card text-primary">
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onTap}
      className="relative z-10 -my-1 flex size-11 shrink-0 items-center justify-center border-0 bg-transparent p-0"
    >
      {face}
    </button>
  )
}

const repeatIcon = (
  <svg {...icon} width="12" height="12" strokeWidth="2.2" className="shrink-0" role="img" aria-label="Repeats">
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11.5V10a4 4 0 0 1 4-4h12" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 12.5V14a4 4 0 0 1-4 4H4" />
  </svg>
)

export function BlockView({
  block,
  look,
  timeFormat,
  repeats,
  onTap,
}: {
  block: PlacedBlock
  look: BlockLook
  timeFormat: TimeFormat
  repeats: boolean
  onTap: () => void
}) {
  const { occurrence: o } = block
  const twoLines = block.height >= TWO_LINES_FROM
  const narrow = block.columns > 1
  // The tap area sits inside the block's outline, so it grows by the outline too.
  const outline = look === 'unknown' ? 1.5 : look === 'current' ? 2 : 0
  const tapPad = Math.max(0, (MIN_TAP - block.height) / 2) + outline
  const range = formatRange(block.start, block.end, timeFormat)
  const duration = formatDuration(o.plannedMinutes)

  const state =
    look === 'current'
      ? ', happening now'
      : look === 'unknown'
        ? ', not logged'
        : look === 'done'
          ? ', done'
          : look === 'skipped'
            ? ', skipped'
            : ''
  const name = `${o.title}, ${range}, ${duration}${state}`

  // The shell: colour, outline and corners for each look.
  let shell = 'text-ink '
  let style: React.CSSProperties = { background: categoryColor(o.color) }
  if (look === 'current') {
    shell += 'rounded-16 border-2 border-primary shadow-inprogress'
  } else if (look === 'unknown') {
    shell += `${twoLines ? 'rounded-14' : 'rounded-12'} border-[1.5px] border-dashed border-unknown-edge`
    style = {
      background:
        'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 5px, var(--color-unknown-stripe-b) 5px 10px)',
    }
  } else if (look === 'skipped') {
    shell += `${twoLines ? 'rounded-14' : 'rounded-12'} text-muted`
    style = { background: 'var(--color-line)' }
  } else {
    shell += twoLines ? 'rounded-14' : 'rounded-12'
  }

  const titleClass =
    look === 'current'
      ? 'text-15 font-bold'
      : twoLines
        ? 'text-14 font-bold'
        : 'text-13-5 font-bold'

  return (
    <div
      className={`relative box-border flex h-full w-full gap-2 ${
        look === 'current' ? 'items-start py-2.5 pr-1 pl-3' : 'items-center pr-0.5 pl-3'
      } ${shell}`}
      style={style}
    >
      {/* The whole block is the tap target; the round button sits on top of it. A short block
          gets a taller invisible tap area, so it is always at least 44 px to hit. */}
      <button
        type="button"
        aria-label={name}
        onClick={onTap}
        className="absolute inset-x-0 rounded-[inherit] border-0 bg-transparent p-0"
        style={{ top: -tapPad, bottom: -tapPad }}
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {look === 'unknown' && (
            <span aria-hidden="true" className="size-2 shrink-0 rounded-4" style={{ background: categoryColor(o.color) }} />
          )}
          <span className={`min-w-0 truncate ${titleClass} ${look === 'skipped' ? 'line-through' : ''}`}>
            {o.title}
          </span>
          {repeats && look !== 'unknown' && look !== 'skipped' && repeatIcon}
          {look === 'current' && (
            <span className="shrink-0 rounded-8 bg-pill px-[7px] py-0.5 text-10 font-extrabold tracking-[0.06em] text-primary">
              NOW
            </span>
          )}
        </span>
        {(twoLines || look === 'current') && (
          <span className="truncate text-12 font-medium">
            {range} · {duration}
          </span>
        )}
      </div>

      {/* Short blocks put the time or a tag on the same line, if there is room for it. */}
      {!twoLines && !narrow && look !== 'current' && (
        <>
          {look === 'unknown' && (
            <span className="pointer-events-none shrink-0 rounded-10 border border-line-strong bg-card px-2 py-0.5 text-11 font-bold text-muted">
              Unknown
            </span>
          )}
          {look === 'skipped' && (
            <span className="pointer-events-none shrink-0 rounded-9 bg-card px-2 py-0.5 text-11 font-bold">Skipped</span>
          )}
          {(look === 'upcoming' || look === 'done') && (
            <span className="pointer-events-none shrink-0 text-12 font-semibold">{range}</span>
          )}
        </>
      )}

      <QuickButton look={look} title={o.title} onTap={onTap} />
    </div>
  )
}
