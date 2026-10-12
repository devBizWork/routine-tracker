import { formatMinutesAsTime, formatRange, type TimeFormat } from '../../data'
import { formatTimeLeft, type NowNext } from './plan'

/**
 * The pinned card under the header (design/screens/Main.html): the block you are in with the
 * time left, and what comes next. It also says something sensible between blocks, before the
 * first one and after the last one.
 */
export function NowNextCard({
  state,
  timeFormat,
  onReviewDay,
}: {
  state: NowNext
  timeFormat: TimeFormat
  onReviewDay: () => void
}) {
  if (state.kind === 'empty') return null
  const at = (minutes: number) => formatMinutesAsTime(minutes, timeFormat)

  return (
    <section
      aria-label="Now and next"
      className="mx-4 mt-4 flex shrink-0 flex-col gap-3 rounded-24 border border-now-border bg-now-fill px-[18px] py-4 text-ink"
    >
      {state.kind === 'current' && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="flex items-center gap-1.5 text-11 font-extrabold tracking-[0.08em] text-muted">
                <span aria-hidden="true" className="size-[7px] rounded-4 bg-primary" />
                NOW · {formatRange(state.block.start, state.block.end, timeFormat)}
              </span>
              <span className="text-19 font-bold tracking-[-0.01em] break-words">{state.block.title}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-display text-24 leading-none font-bold whitespace-nowrap">
                {formatTimeLeft(state.secondsLeft)}
              </span>
              <span className="text-12 font-semibold text-muted">left</span>
            </div>
          </div>

          <div aria-hidden="true" className="h-1.5 rounded-3 bg-now-track">
            <div className="h-1.5 rounded-3 bg-primary" style={{ width: `${state.progress * 100}%` }} />
          </div>

          <div className="flex items-center gap-2.5 border-t border-now-border pt-3">
            <span className="text-11 font-extrabold tracking-[0.08em] text-muted">NEXT</span>
            {state.next ? (
              <>
                <span className="min-w-0 flex-1 text-14 font-semibold break-words">{state.next.title}</span>
                <span className="text-13 font-semibold whitespace-nowrap text-muted">{at(state.next.start)}</span>
              </>
            ) : (
              <span className="min-w-0 flex-1 text-14 font-semibold text-muted">Nothing else planned today</span>
            )}
          </div>
        </>
      )}

      {state.kind === 'free' && (
        <p className="m-0 text-17 leading-[1.3] font-bold break-words">
          Free until {at(state.until)} · Next: {state.next.title}
        </p>
      )}

      {state.kind === 'before' && (
        <p className="m-0 text-17 leading-[1.3] font-bold break-words">
          First up: {state.first.title} at {at(state.first.start)}
        </p>
      )}

      {state.kind === 'done' && (
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-19 font-bold tracking-[-0.01em]">Day done</p>
          <button
            type="button"
            onClick={onReviewDay}
            className="flex h-11 shrink-0 items-center rounded-22 border-0 bg-card px-4 text-14 font-bold text-primary"
          >
            Review day
          </button>
        </div>
      )}
    </section>
  )
}
