import {
  categoryColor,
  deviation,
  deviationTag,
  elapsedSeconds,
  formatDuration,
  formatElapsed,
  formatRange,
  formatTime,
  timeOfMoment,
  type TimeFormat,
  type Tolerances,
} from '../../data'
import { TWO_LINES_FROM, type BlockLook, type PlacedBlock } from './plan'

/** The smallest comfortable tap target, in pixels. */
const MIN_TAP = 44
/** A running block at least this tall (about 55 minutes) keeps the roomy look; shorter is compact. */
const CURRENT_ROOMY_FROM = 64
/** A running block this tall (about 85 minutes) has room for all three lines of the design. */
const RUNNING_FULL_FROM = 96

// One block on the timeline, drawn from design/screens/Main.html and States.html. The whole
// block is a button (it opens the Log time sheet, or the edit sheet for a block still to come),
// and so is the round button at its right (start the timer, stop it, or edit the log).

const icon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

/**
 * The round button at the right of a block. `room` is the tallest the drawn circle may be, so
 * it never sticks out of a short block; the tap area around it stays 44 px either way.
 */
function QuickButton({
  look,
  title,
  offPlan,
  onTap,
  room,
}: {
  look: BlockLook
  title: string
  offPlan: boolean
  onTap: () => void
  room: number
}) {
  const label =
    look === 'unknown'
      ? `${title} was not logged. Log it now`
      : look === 'done'
        ? `${title} done${offPlan ? ', off plan' : ''}. Edit log`
        : look === 'skipped'
          ? `${title} skipped. Edit log`
          : look === 'running'
            ? `Stop timer for ${title}`
            : `Start timer for ${title}`

  const nominal = look === 'current' || look === 'running' ? 36 : look === 'done' ? 30 : 28
  const size = Math.max(18, Math.min(nominal, Math.floor(room)))
  const box = { width: size, height: size }
  const glyph = (full: number) => Math.round((full * size) / nominal)

  let face
  if (look === 'done') {
    face = offPlan ? (
      <span
        style={box}
        className="box-border flex items-center justify-center rounded-full border-[1.5px] border-missed-text bg-card text-missed-text"
      >
        <svg {...icon} width={glyph(15)} height={glyph(15)} strokeWidth="2.6">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    ) : (
      <span style={box} className="flex items-center justify-center rounded-full bg-primary text-on-primary">
        <svg {...icon} width={glyph(15)} height={glyph(15)} strokeWidth="2.8">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    )
  } else if (look === 'skipped') {
    face = (
      <span style={box} className="flex items-center justify-center rounded-full bg-card text-muted">
        <svg {...icon} width={glyph(15)} height={glyph(15)} strokeWidth="2.4">
          <circle cx="12" cy="12" r="8" />
          <path d="M6.5 6.5l11 11" />
        </svg>
      </span>
    )
  } else if (look === 'unknown') {
    face = (
      <span
        style={box}
        className="box-border flex items-center justify-center rounded-full border-[1.5px] border-dashed border-muted bg-card text-muted"
      >
        <svg {...icon} width={glyph(15)} height={glyph(15)} strokeWidth="2.4">
          <path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.6" />
          <path d="M12 17.2h.01" />
        </svg>
      </span>
    )
  } else if (look === 'running') {
    face = (
      <span style={box} className="flex items-center justify-center rounded-full bg-primary text-on-primary">
        <svg width={glyph(16)} height={glyph(16)} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
        </svg>
      </span>
    )
  } else if (look === 'current') {
    face = (
      <span style={box} className="flex items-center justify-center rounded-full bg-primary text-on-primary">
        <svg width={glyph(16)} height={glyph(16)} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </span>
    )
  } else {
    face = (
      <span style={box} className="flex items-center justify-center rounded-full bg-card text-primary">
        <svg width={glyph(13)} height={glyph(13)} viewBox="0 0 24 24" aria-hidden="true">
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

const clockIcon = (
  <svg {...icon} width="14" height="14" strokeWidth="2.2" className="shrink-0">
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 10v3.5l2 1.5M9.5 3h5" />
  </svg>
)

export function BlockView({
  block,
  look,
  timeFormat,
  repeats,
  tolerances,
  nowMs,
  onOpen,
  onQuick,
  canStart = true,
}: {
  block: PlacedBlock
  look: BlockLook
  timeFormat: TimeFormat
  repeats: boolean
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>
  /** The moment now, in milliseconds: a running timer is worked out from it. */
  nowMs: number
  /** Tap on the block itself. */
  onOpen: () => void
  /** Tap on the round button. */
  onQuick: () => void
  /** False on other days than today: a block still to come has no play button there. */
  canStart?: boolean
}) {
  const { occurrence: o } = block
  const twoLines = block.height >= TWO_LINES_FROM
  const narrow = block.columns > 1
  const live = look === 'current' || look === 'running'
  // The tap area sits inside the block's outline, so it grows by the outline too.
  const outline = look === 'unknown' ? 1.5 : live ? 2 : 0
  const tapPad = Math.max(0, (MIN_TAP - block.height) / 2) + outline
  const range = formatRange(block.start, block.end, timeFormat)
  const duration = formatDuration(o.plannedMinutes)
  // A running block is taller inside (two lines, padding) only when it has the height for it;
  // a short one (a 15-minute block is about 30 px) is a single line and a smaller button.
  const roomy = !live || block.height >= CURRENT_ROOMY_FROM
  // How tall the round button may be: the block less its outline and a little air.
  const buttonRoom = block.height - 2 * outline - 4

  // A finished block that drifted from the plan gets a tag: "+15 min", "Started 60 min late".
  const drift = look === 'done' ? deviation(o, tolerances) : { kind: 'none' as const }
  const tag = deviationTag(drift)
  const offPlan = tag !== null

  const timer =
    look === 'running' && o.timerStartedAt !== null
      ? {
          elapsed: formatElapsed(elapsedSeconds(o.timerStartedAt, nowMs)),
          since: formatTime(timeOfMoment(o.timerStartedAt), timeFormat),
        }
      : null
  const fullRunning = look === 'running' && block.height >= RUNNING_FULL_FROM
  const midRunning = look === 'running' && !fullRunning && roomy

  const state =
    look === 'running'
      ? `, timer running ${timer?.elapsed ?? ''}`
      : look === 'current'
        ? ', happening now'
        : look === 'unknown'
          ? ', not logged'
          : look === 'done'
            ? `, done${tag ? `, ${tag}` : ''}`
            : look === 'skipped'
              ? ', skipped'
              : ''
  const name = `${o.title}, ${range}, ${duration}${state}`

  // The shell: colour, outline and corners for each look.
  let shell = 'text-ink '
  let style: React.CSSProperties = { background: categoryColor(o.color) }
  if (live) {
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

  const titleClass = live ? 'text-15 font-bold' : twoLines ? 'text-14 font-bold' : 'text-13-5 font-bold'

  // The chip with the running time. On the roomy blocks it is the full "Timer 57:12 · since 9:15";
  // on a short block it sits beside the title and is just the clock and the time.
  const timerChip = (full: boolean) =>
    timer && (
      <span
        className={`pointer-events-none flex shrink-0 items-center gap-1.5 rounded-12 border border-line-strong bg-card px-2.5 py-[3px] text-12 font-bold ${
          full ? 'self-start' : ''
        }`}
      >
        {clockIcon}
        {full ? `Timer ${timer.elapsed} · since ${timer.since}` : timer.elapsed}
      </span>
    )

  return (
    <div
      className={`relative box-border flex h-full w-full gap-2 ${
        live && roomy ? 'items-start py-2 pr-1 pl-3' : 'items-center pr-0.5 pl-3'
      } ${shell}`}
      style={style}
    >
      {/* The whole block is the tap target; the round button sits on top of it. A short block
          gets a taller invisible tap area, so it is always at least 44 px to hit. */}
      <button
        type="button"
        aria-label={name}
        onClick={onOpen}
        className="absolute inset-x-0 rounded-[inherit] border-0 bg-transparent p-0"
        style={{ top: -tapPad, bottom: -tapPad }}
      />

      <div className={`pointer-events-none relative flex min-w-0 flex-1 flex-col ${fullRunning ? 'gap-1' : 'gap-0.5'}`}>
        <span className="flex min-w-0 items-center gap-1.5">
          {look === 'unknown' && (
            <span aria-hidden="true" className="size-2 shrink-0 rounded-4" style={{ background: categoryColor(o.color) }} />
          )}
          <span className={`min-w-0 truncate ${titleClass} ${look === 'skipped' ? 'line-through' : ''}`}>
            {o.title}
          </span>
          {repeats && look !== 'unknown' && look !== 'skipped' && repeatIcon}
          {live && roomy && (
            <span className="shrink-0 rounded-8 bg-pill px-[7px] py-0.5 text-10 font-extrabold tracking-[0.06em] text-primary">
              NOW
            </span>
          )}
        </span>
        {twoLines && !midRunning && (
          <span className="truncate text-12 font-medium">
            {range} · {duration}
          </span>
        )}
        {(fullRunning || midRunning) && (
          <span className={fullRunning ? 'mt-1.5 flex' : 'mt-1 flex'}>{timerChip(true)}</span>
        )}
        {/* In a narrow column the tag does not fit beside the title, so it goes underneath. */}
        {tag && narrow && twoLines && (
          <span className="self-start rounded-10 bg-card px-2 py-0.5 text-11 font-extrabold text-missed-text">{tag}</span>
        )}
      </div>

      {/* Short running blocks keep the timer on the title line. */}
      {look === 'running' && !roomy && !narrow && timerChip(false)}

      {/* Short blocks put the time or a tag on the same line, if there is room for it. */}
      {!narrow && look !== 'current' && look !== 'running' && (
        <>
          {look === 'unknown' && !twoLines && (
            <span className="pointer-events-none shrink-0 rounded-10 border border-line-strong bg-card px-2 py-0.5 text-11 font-bold text-muted">
              Unknown
            </span>
          )}
          {look === 'skipped' && !twoLines && (
            <span className="pointer-events-none shrink-0 rounded-9 bg-card px-2 py-0.5 text-11 font-bold">Skipped</span>
          )}
          {tag && (
            <span className="pointer-events-none shrink-0 rounded-10 bg-card px-2 py-0.5 text-11 font-extrabold text-missed-text">
              {tag}
            </span>
          )}
          {!tag && !twoLines && (look === 'upcoming' || look === 'done') && (
            <span className="pointer-events-none shrink-0 text-12 font-semibold">{range}</span>
          )}
        </>
      )}

      {(canStart || (look !== 'upcoming' && look !== 'current')) && (
        <QuickButton look={look} title={o.title} offPlan={offPlan} onTap={onQuick} room={buttonRoom} />
      )}
    </div>
  )
}
