import type { Occurrence, TimeFormat, Tolerances } from '../../data'
import { formatClock, formatHourLabel } from '../../data'
import { actualBars } from './actuals'
import { BlockView } from './BlockView'
import {
  blockLook,
  hourLines,
  placeBlocks,
  timelineHeight,
  yAt,
  type TimeRange,
} from './plan'

/**
 * The day as a vertical timeline (design/screens/Main.html): an hour label and line for every
 * hour, each block placed by its start and sized by its length, and the now line on top.
 * Blocks that overlap in time sit side by side. A thin bar left of a block is the time actually
 * logged (or, for a running timer, the time so far).
 */
export function Timeline({
  occurrences,
  range,
  nowMinutes,
  timeFormat,
  repeating,
  tolerances,
  nowMs,
  onBlockOpen,
  onBlockQuick,
}: {
  occurrences: readonly Occurrence[]
  range: TimeRange
  /** The time the now line points at. */
  nowMinutes: number
  timeFormat: TimeFormat
  /** Ids of the tasks that repeat (their blocks get the repeat mark). */
  repeating: ReadonlySet<string>
  tolerances: Pick<Tolerances, 'onTimeMin' | 'lengthPct'>
  /** The moment now (ms); running timers are worked out from it. */
  nowMs: number
  /** A tap on a block's body. */
  onBlockOpen: (occurrence: Occurrence) => void
  /** A tap on a block's round button. */
  onBlockQuick: (occurrence: Occurrence) => void
}) {
  const placed = placeBlocks(occurrences, range)
  const bars = actualBars(occurrences, nowMs, range, tolerances)
  const nowInRange = nowMinutes >= range.start && nowMinutes <= range.end

  return (
    <div className="relative" style={{ height: timelineHeight(range) }}>
      {hourLines(range).map((hour) => (
        <div
          key={hour}
          aria-hidden="true"
          className="absolute inset-x-0 flex h-4 items-center gap-2"
          style={{ top: yAt(hour * 60, range) - 8 }}
        >
          <span className="w-[46px] text-right text-11 font-semibold text-muted">
            {formatHourLabel(hour, timeFormat)}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
      ))}

      {/* The actual bars sit in the gap between the hour labels and the blocks. */}
      {bars.map((bar) => (
        <div
          key={bar.id}
          aria-hidden="true"
          data-actual-bar={bar.running ? 'running' : bar.offPlan ? 'off-plan' : 'on-plan'}
          className={`absolute left-[54px] w-1.5 ${bar.running ? 'rounded-t-3' : 'rounded-3'} ${
            bar.offPlan ? 'bg-missed' : 'bg-primary'
          }`}
          style={{ top: bar.top, height: bar.height }}
        />
      ))}

      <div className="absolute inset-y-0 right-0 left-[66px]">
        {placed.map((block) => (
          <div
            key={block.id}
            className="absolute"
            style={{
              top: block.top,
              height: block.height,
              left: `${(block.column / block.columns) * 100}%`,
              width: `${100 / block.columns}%`,
              // A small gap between side-by-side blocks.
              paddingRight: block.column < block.columns - 1 ? 4 : 0,
            }}
          >
            <BlockView
              block={block}
              look={blockLook(block.occurrence, nowMinutes)}
              timeFormat={timeFormat}
              repeats={repeating.has(block.occurrence.taskId)}
              tolerances={tolerances}
              nowMs={nowMs}
              onOpen={() => onBlockOpen(block.occurrence)}
              onQuick={() => onBlockQuick(block.occurrence)}
            />
          </div>
        ))}
      </div>

      {nowInRange && (
        <div
          aria-hidden="true"
          data-now-line
          className="pointer-events-none absolute inset-x-0 z-20 flex h-[20px] items-center"
          style={{ top: yAt(nowMinutes, range) - 10 }}
        >
          <span className="flex h-[20px] w-[46px] items-center justify-center rounded-10 bg-now-line text-10-5 font-extrabold text-on-primary">
            {formatClock(nowMinutes, timeFormat)}
          </span>
          <span className="ml-0.5 box-border size-3.5 rounded-7 border-2 border-ground bg-now-line shadow-now-dot" />
          <span className="h-[3px] flex-1 rounded-2 bg-now-line shadow-now-line" />
        </div>
      )}
    </div>
  )
}
