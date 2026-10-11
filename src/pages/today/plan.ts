import { isUnlogged, timeToMinutes, type Occurrence } from '../../data'

// The rules behind the Today screen, kept apart from the screen so they can be tested:
// where a block sits on the timeline, which blocks share the width, and what the pinned
// Now / Next card should say. Times are minutes after midnight unless a name says seconds.

/** Same scale as design/screens/Main.html: one hour is 80 px. */
export const PX_PER_HOUR = 80
export const PX_PER_MINUTE = PX_PER_HOUR / 60
const TOP_PAD = 14 // room above the first hour line
const BOTTOM_PAD = 28 // room below the last one
const BLOCK_INSET = 1 // a block starts 1 px below its time
const BLOCK_GAP = 3 // and ends 3 px short, so neighbours do not touch
/** Even a 5-minute block is tall enough to read and tap. */
export const MIN_BLOCK_HEIGHT = 30
/** Below this height a block is one line (title and time); at or above it, two. */
export const TWO_LINES_FROM = 50
const MINUTES_PER_DAY = 24 * 60

/** The blocks' times, as the rules need them. */
export interface Span {
  id: string
  title: string
  start: number
  end: number
}

export function spanOf(o: Occurrence): Span {
  const start = timeToMinutes(o.plannedStart)
  return { id: o.id, title: o.title, start, end: Math.min(MINUTES_PER_DAY, start + o.plannedMinutes) }
}

// ---- The visible part of the day ----

export interface TimeRange {
  start: number
  end: number
}

/**
 * From the day's start to its end (Settings), widened to whole hours so that a block outside
 * those hours (a 4:30 am workout) is still on the timeline instead of out of reach.
 */
export function visibleRange(spans: readonly Span[], dayStart: string, dayEnd: string): TimeRange {
  let start = Math.floor(timeToMinutes(dayStart) / 60) * 60
  let end = Math.ceil(timeToMinutes(dayEnd) / 60) * 60
  for (const s of spans) {
    start = Math.min(start, Math.floor(s.start / 60) * 60)
    end = Math.max(end, Math.ceil(s.end / 60) * 60)
  }
  return { start, end: Math.min(end, MINUTES_PER_DAY) }
}

/** The hours that get a line and a label. */
export function hourLines(range: TimeRange): number[] {
  const first = Math.ceil(range.start / 60)
  const last = Math.floor(range.end / 60)
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i)
}

/** Distance from the top of the timeline to a time of day. */
export function yAt(minutes: number, range: TimeRange): number {
  return TOP_PAD + (minutes - range.start) * PX_PER_MINUTE
}

export function timelineHeight(range: TimeRange): number {
  return TOP_PAD + (range.end - range.start) * PX_PER_MINUTE + BOTTOM_PAD
}

// ---- Blocks on the timeline ----

export interface PlacedBlock extends Span {
  occurrence: Occurrence
  top: number
  height: number
  /** Which side-by-side column (0 = leftmost) and how many columns share this stretch of time. */
  column: number
  columns: number
}

/** The time a block really takes up on screen: never shorter than the minimum height. */
const visualEnd = (s: Span) => Math.max(s.end, s.start + MIN_BLOCK_HEIGHT / PX_PER_MINUTE)

/**
 * Puts each block on the timeline. Blocks that overlap in time share the width side by side
 * (two overlapping blocks get half each). Blocks that only touch do not overlap. A very short
 * block counts as taking its minimum height, so it does not sit on top of the next one.
 */
export function placeBlocks(occurrences: readonly Occurrence[], range: TimeRange): PlacedBlock[] {
  const spans = occurrences
    .map((occurrence) => ({ occurrence, ...spanOf(occurrence) }))
    .sort((a, b) => a.start - b.start || b.end - a.end || a.title.localeCompare(b.title))

  const placed: PlacedBlock[] = []
  let group: { span: (typeof spans)[number]; column: number }[] = []
  let columnEnds: number[] = []
  let groupEnd = -Infinity

  const closeGroup = () => {
    for (const { span, column } of group) {
      const height = Math.max((span.end - span.start) * PX_PER_MINUTE - BLOCK_GAP, MIN_BLOCK_HEIGHT)
      placed.push({
        ...span,
        top: yAt(span.start, range) + BLOCK_INSET,
        height,
        column,
        columns: columnEnds.length,
      })
    }
    group = []
    columnEnds = []
    groupEnd = -Infinity
  }

  for (const span of spans) {
    if (span.start >= groupEnd) closeGroup()
    let column = columnEnds.findIndex((end) => end <= span.start)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = visualEnd(span)
    group.push({ span, column })
    groupEnd = Math.max(groupEnd, visualEnd(span))
  }
  closeGroup()
  return placed
}

// ---- How a block looks ----

export type BlockLook = 'current' | 'upcoming' | 'unknown' | 'done' | 'skipped'

/**
 * current: the now line is inside it. unknown: it is over and nothing was logged (never "missed").
 * done and skipped: already logged. upcoming: everything else (still to come).
 */
export function blockLook(o: Occurrence, nowMinutes: number): BlockLook {
  if (o.status === 'skipped') return 'skipped'
  if (o.status === 'done') return 'done'
  const { start, end } = spanOf(o)
  if (nowMinutes >= start && nowMinutes < end) return 'current'
  if (nowMinutes >= end && isUnlogged(o)) return 'unknown'
  return 'upcoming'
}

// ---- The pinned Now / Next card ----

export type NowNext =
  | { kind: 'empty' }
  | { kind: 'current'; block: Span; secondsLeft: number; progress: number; next: Span | null }
  | { kind: 'free'; until: number; next: Span }
  | { kind: 'before'; first: Span }
  | { kind: 'done' }

/**
 * What the card says right now.
 * current: a block is under the now line (if several are, the one that started last).
 * free: between blocks, with something still to come. before: nothing has started yet.
 * done: every block is over. empty: no blocks at all.
 */
export function nowNext(spans: readonly Span[], nowSeconds: number): NowNext {
  if (spans.length === 0) return { kind: 'empty' }

  const startsAfter = spans
    .filter((s) => s.start * 60 > nowSeconds)
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
  const current = spans
    .filter((s) => s.start * 60 <= nowSeconds && nowSeconds < s.end * 60)
    .sort((a, b) => b.start - a.start || a.end - b.end)[0]

  if (current) {
    const total = (current.end - current.start) * 60
    return {
      kind: 'current',
      block: current,
      secondsLeft: Math.max(0, current.end * 60 - nowSeconds),
      progress: Math.min(1, Math.max(0, (nowSeconds - current.start * 60) / total)),
      next: startsAfter[0] ?? null,
    }
  }

  const next = startsAfter[0]
  if (!next) return { kind: 'done' }
  if (spans.every((s) => s.start * 60 > nowSeconds)) return { kind: 'before', first: next }
  return { kind: 'free', until: next.start, next }
}

/** 1072 seconds -> "17:52"; 3725 seconds -> "1:02:05". */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// ---- The clock ----

/** Seconds after midnight, local time. */
export function secondsOfDay(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
}

/** Minutes after midnight, with a fraction for the seconds. */
export function minutesOfDay(date: Date): number {
  return secondsOfDay(date) / 60
}

/** The moment rounded down to a multiple of `seconds` (the now line moves in steps of 15). */
export function roundDown(date: Date, seconds: number): Date {
  const step = seconds * 1000
  return new Date(Math.floor(date.getTime() / step) * step)
}

/**
 * Where to scroll so that `anchorY` sits about a third of the way down the visible area,
 * without scrolling past either end.
 */
export function scrollTopFor(anchorY: number, viewportHeight: number, contentHeight: number): number {
  const wanted = anchorY - viewportHeight / 3
  return Math.min(Math.max(0, wanted), Math.max(0, contentHeight - viewportHeight))
}
