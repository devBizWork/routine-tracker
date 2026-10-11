import { format } from 'date-fns'

const soundIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
    <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
  </svg>
)

/**
 * The top of the Today screen (design/screens/Main.html, FirstRun.html): the full date, the
 * title, the Day score chip and the sound button. The chip shows a dash until scores arrive
 * in Step 7, and the sound button is wired in Step 11; both say "Coming soon" when tapped.
 */
export function TodayHeader({ now, onComingSoon }: { now: Date; onComingSoon: () => void }) {
  return (
    <header
      className="flex shrink-0 items-end justify-between gap-3 px-5"
      style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 text-14 font-semibold text-muted">{format(now, 'EEEE, MMMM d')}</p>
        <h1 className="m-0 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">Today</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Day score: not available yet"
          onClick={onComingSoon}
          className="box-border flex h-11 items-center gap-2 rounded-22 border border-line bg-card pr-3.5 pl-2 text-ink"
        >
          <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-line)" strokeWidth="5" />
          </svg>
          <span className="flex flex-col leading-[1.1]">
            <span className="text-10 font-extrabold tracking-[0.06em] text-muted">DAY</span>
            <span className="text-15 font-bold">–</span>
          </span>
        </button>

        <button
          type="button"
          aria-label="Mute sounds"
          aria-pressed="false"
          onClick={onComingSoon}
          className="box-border flex size-11 items-center justify-center rounded-22 border border-line bg-card p-0 text-primary"
        >
          {soundIcon}
        </button>
      </div>
    </header>
  )
}
