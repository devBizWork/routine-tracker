import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../../data'
import {
  MIN_BLOCK_HEIGHT,
  PX_PER_HOUR,
  blockLook,
  formatCountdown,
  hourLines,
  minutesOfDay,
  nowNext,
  placeBlocks,
  roundDown,
  scrollTopFor,
  secondsOfDay,
  spanOf,
  timelineHeight,
  visibleRange,
  yAt,
  type Span,
} from './plan'

let counter = 0
function block(title: string, start: string, minutes: number, extra: Partial<Occurrence> = {}): Occurrence {
  return {
    id: `o${++counter}`,
    taskId: 't',
    date: '2026-10-08',
    title,
    color: 'focus',
    plannedStart: start,
    plannedMinutes: minutes,
    status: 'planned',
    actualStart: null,
    actualEnd: null,
    timerStartedAt: null,
    note: '',
    ...extra,
  }
}

const hm = (h: number, m = 0) => h * 60 + m
const range = visibleRange([], '05:00', '23:00')

describe('visible range', () => {
  it('is the day from Settings, in whole hours', () => {
    expect(range).toEqual({ start: hm(5), end: hm(23) })
    expect(visibleRange([], '05:30', '22:15')).toEqual({ start: hm(5), end: hm(23) })
  })

  it('widens to include a block outside those hours', () => {
    const early = spanOf(block('Run', '04:30', 45))
    const late = spanOf(block('Reading', '23:00', 55))
    expect(visibleRange([early], '05:00', '23:00')).toEqual({ start: hm(4), end: hm(23) })
    expect(visibleRange([late], '05:00', '23:00')).toEqual({ start: hm(5), end: hm(24) })
  })

  it('never goes past midnight', () => {
    expect(visibleRange([], '05:00', '23:59').end).toBe(hm(24))
  })

  it('has a line for every whole hour', () => {
    expect(hourLines(range)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23])
    expect(hourLines({ start: hm(5, 30), end: hm(8, 30) })).toEqual([6, 7, 8])
  })
})

describe('where blocks sit', () => {
  it('uses 80 px for an hour, like the design', () => {
    expect(PX_PER_HOUR).toBe(80)
    expect(yAt(hm(8), range) - yAt(hm(7), range)).toBe(80)
    expect(yAt(hm(7, 30), range) - yAt(hm(7), range)).toBe(40)
  })

  it('starts a block 1 px below its time and ends it 3 px short (as in Main.html)', () => {
    const [workout, admin] = placeBlocks([block('Morning workout', '06:30', 60), block('Admin', '11:15', 45)], range)
    expect(workout!.top).toBe(yAt(hm(6, 30), range) + 1)
    expect(workout!.height).toBe(77) // 60 min = 80 px, minus 3
    expect(admin!.height).toBe(57) // 45 min = 60 px, minus 3
    expect(admin!.top - workout!.top).toBe((hm(11, 15) - hm(6, 30)) * (80 / 60))
  })

  it('makes a 30-minute block 37 px tall, as in the design', () => {
    expect(placeBlocks([block('Call', '10:30', 30)], range)[0]!.height).toBe(37)
  })

  it('never makes a block shorter than the minimum', () => {
    expect(placeBlocks([block('Quick', '10:00', 5)], range)[0]!.height).toBe(MIN_BLOCK_HEIGHT)
  })

  it('has a height that fits the whole range', () => {
    expect(timelineHeight(range)).toBeGreaterThan((hm(23) - hm(5)) * (80 / 60))
  })
})

describe('overlapping blocks', () => {
  const widths = (blocks: ReturnType<typeof placeBlocks>) => blocks.map((b) => [b.title, b.column, b.columns])

  it('a block on its own takes the full width', () => {
    expect(widths(placeBlocks([block('A', '09:00', 60)], range))).toEqual([['A', 0, 1]])
  })

  it('two overlapping blocks sit side by side at half width', () => {
    const placed = placeBlocks([block('Deep work', '09:00', 90), block('Call', '10:00', 30)], range)
    expect(widths(placed)).toEqual([
      ['Deep work', 0, 2],
      ['Call', 1, 2],
    ])
  })

  it('blocks that only touch do not overlap', () => {
    const placed = placeBlocks([block('A', '09:00', 60), block('B', '10:00', 60)], range)
    expect(widths(placed)).toEqual([
      ['A', 0, 1],
      ['B', 0, 1],
    ])
  })

  it('a chain reuses a free column: A and B overlap, B and C overlap, A is over before C', () => {
    const placed = placeBlocks([block('A', '09:00', 60), block('B', '09:30', 60), block('C', '10:00', 60)], range)
    expect(widths(placed)).toEqual([
      ['A', 0, 2],
      ['B', 1, 2],
      ['C', 0, 2],
    ])
  })

  it('three at the same time share the width in thirds', () => {
    const placed = placeBlocks([block('A', '09:00', 60), block('B', '09:00', 60), block('C', '09:15', 30)], range)
    expect(placed.every((p) => p.columns === 3)).toBe(true)
    expect(new Set(placed.map((p) => p.column))).toEqual(new Set([0, 1, 2]))
  })

  it('a short block next to the one after it shares the width, so they never draw over each other', () => {
    // 10:00 for 10 minutes is drawn at least 30 px tall, which reaches into the block at 10:10.
    const placed = placeBlocks([block('Tiny', '10:00', 10), block('Next', '10:10', 30)], range)
    expect(placed.map((p) => p.columns)).toEqual([2, 2])
  })

  it('separate stretches of the day are laid out on their own', () => {
    const placed = placeBlocks(
      [block('Morning', '06:30', 60), block('Noon A', '12:00', 60), block('Noon B', '12:30', 60)],
      range,
    )
    expect(widths(placed)).toEqual([
      ['Morning', 0, 1],
      ['Noon A', 0, 2],
      ['Noon B', 1, 2],
    ])
  })
})

describe('how a block looks', () => {
  const o = block('Deep work', '09:00', 90) // 9:00 - 10:30
  it('is upcoming before it starts, current while the line crosses it, unknown after', () => {
    expect(blockLook(o, hm(8, 59))).toBe('upcoming')
    expect(blockLook(o, hm(9))).toBe('current')
    expect(blockLook(o, hm(10, 29.5))).toBe('current')
    expect(blockLook(o, hm(10, 30))).toBe('unknown')
  })

  it('a logged block keeps its logged look whatever the time', () => {
    const done = block('Walk', '12:00', 30, { status: 'done', actualStart: '12:00', actualEnd: '12:30' })
    const skipped = block('Walk', '12:00', 30, { status: 'skipped' })
    expect(blockLook(done, hm(9))).toBe('done')
    expect(blockLook(done, hm(12, 10))).toBe('done')
    expect(blockLook(skipped, hm(15))).toBe('skipped')
  })

  it('a block with a note or a running timer is not "unknown" when it is over', () => {
    expect(blockLook(block('A', '09:00', 30, { note: 'ran late' }), hm(11))).toBe('upcoming')
    expect(blockLook(block('B', '09:00', 30, { timerStartedAt: 1 }), hm(11))).toBe('upcoming')
  })
})

describe('Now / Next card', () => {
  const at = (h: number, m = 0, s = 0) => h * 3600 + m * 60 + s
  const day: Span[] = [
    { id: 'a', title: 'Morning workout', start: hm(6, 30), end: hm(7, 30) },
    { id: 'b', title: 'Deep work', start: hm(9), end: hm(10, 30) },
    { id: 'c', title: 'Client check-in call', start: hm(10, 30), end: hm(11) },
  ]

  it('has nothing to say when there are no blocks', () => {
    expect(nowNext([], at(9))).toEqual({ kind: 'empty' })
  })

  it('before the first block: "First up"', () => {
    const state = nowNext(day, at(5, 45))
    expect(state).toMatchObject({ kind: 'before' })
    expect(state.kind === 'before' && state.first.title).toBe('Morning workout')
  })

  it('during a block: the block, the time left, the progress and the next one', () => {
    const state = nowNext(day, at(9, 18, 8)) // 17:52 left of a 90-minute block
    expect(state.kind).toBe('current')
    if (state.kind !== 'current') return
    expect(state.block.title).toBe('Deep work')
    expect(state.secondsLeft).toBe(at(10, 30) - at(9, 18, 8))
    expect(formatCountdown(state.secondsLeft)).toBe('1:11:52')
    expect(state.progress).toBeCloseTo((18 * 60 + 8) / (90 * 60), 5)
    expect(state.next?.title).toBe('Client check-in call')
  })

  it('shows minutes and seconds left, like the design (17:52)', () => {
    const state = nowNext(day, at(10, 12, 8))
    expect(state.kind === 'current' && formatCountdown(state.secondsLeft)).toBe('17:52')
  })

  it('between blocks: "Free until" with the next one', () => {
    const state = nowNext(day, at(8, 10))
    expect(state.kind).toBe('free')
    if (state.kind !== 'free') return
    expect(state.until).toBe(hm(9))
    expect(state.next.title).toBe('Deep work')
  })

  it('after the last block: day done', () => {
    expect(nowNext(day, at(11, 0, 1))).toEqual({ kind: 'done' })
    expect(nowNext(day, at(22))).toEqual({ kind: 'done' })
  })

  it('the minute a block starts it is current, and the minute it ends it is not', () => {
    expect(nowNext(day, at(9)).kind).toBe('current')
    expect(nowNext(day, at(7, 30)).kind).toBe('free')
    const last = nowNext(day, at(10, 30)) // Deep work just ended, the call just started
    expect(last.kind === 'current' && last.block.title).toBe('Client check-in call')
    expect(last.kind === 'current' && last.next).toBeNull() // nothing after the call
  })

  it('with overlapping blocks the one that started last is "now"', () => {
    const overlap: Span[] = [
      { id: 'x', title: 'Deep work', start: hm(9), end: hm(10, 30) },
      { id: 'y', title: 'Call', start: hm(10), end: hm(10, 30) },
      { id: 'z', title: 'Lunch', start: hm(12), end: hm(12, 30) },
    ]
    const state = nowNext(overlap, at(10, 10))
    expect(state.kind === 'current' && state.block.title).toBe('Call')
    expect(state.kind === 'current' && state.next?.title).toBe('Lunch')
  })
})

describe('countdown text', () => {
  it('writes minutes and seconds, and hours when there are any', () => {
    expect(formatCountdown(1072)).toBe('17:52')
    expect(formatCountdown(59)).toBe('0:59')
    expect(formatCountdown(307)).toBe('5:07')
    expect(formatCountdown(3725)).toBe('1:02:05')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-5)).toBe('0:00')
  })
})

describe('the clock', () => {
  const t = new Date(2026, 9, 8, 10, 12, 44)
  it('reads the time of day', () => {
    expect(secondsOfDay(t)).toBe(10 * 3600 + 12 * 60 + 44)
    expect(minutesOfDay(t)).toBeCloseTo(612.7333, 3)
  })

  it('rounds down to a 15-second step, so the now line moves in steps', () => {
    expect(roundDown(t, 15).getSeconds()).toBe(30)
    expect(roundDown(new Date(2026, 9, 8, 10, 12, 59), 15).getSeconds()).toBe(45)
    expect(roundDown(new Date(2026, 9, 8, 10, 12, 0), 15).getSeconds()).toBe(0)
  })
})

describe('scrolling to now', () => {
  it('puts the now line a third of the way down', () => {
    expect(scrollTopFor(1000, 600, 2000)).toBe(800)
  })

  it('does not scroll above the top or past the bottom', () => {
    expect(scrollTopFor(100, 600, 2000)).toBe(0)
    expect(scrollTopFor(1990, 600, 2000)).toBe(1400)
  })

  it('does not scroll when everything fits', () => {
    expect(scrollTopFor(300, 600, 500)).toBe(0)
  })
})
