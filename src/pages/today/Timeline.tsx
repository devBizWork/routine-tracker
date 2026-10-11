import type { Occurrence, TimeFormat } from '../../data'
import { formatClock, formatHourLabel } from '../../data'
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
 * Blocks that overlap in time sit side by side.
 */
export function Timeline({
  occurrences,
  range,
  nowMinutes,
  timeFormat,
  repeating,
  onBlockTap,
}: {
  occurrences: readonly Occurrence[]
  range: TimeRange
  /** The time the now line points at. */
  nowMinutes: number
  timeFormat: TimeFormat
  /** Ids of the tasks that repeat (their blocks get the repeat mark). */
  repeating: ReadonlySet<string>
  onBlockTap: () => void
}) {
  const placed = placeBlocks(occurrences, range)
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
              onTap={onBlockTap}
            />
          </div>
        ))}
      </div>

      {nowInRange && (
        <div
          aria-hidden="true"
          data-now-line
          className="pointer-events-none absolute inset-x-0 z-20 flex h-[18px] items-center"
          style={{ top: yAt(nowMinutes, range) - 9 }}
        >
          <span className="flex h-[18px] w-[46px] items-center justify-center rounded-9 bg-primary text-10-5 font-extrabold text-on-primary">
            {formatClock(nowMinutes, timeFormat)}
          </span>
          <span className="ml-0.5 box-border size-3 rounded-6 border-2 border-ground bg-primary" />
          <span className="h-0.5 flex-1 bg-primary" />
        </div>
      )}
    </div>
  )
}
