import type { Occurrence } from '../../data'
import { toPercent, type DayScore } from '../../scoring'

// The Day score card at the top of the Day review (design/screens/DayReview.html). The separate
// Logged score card was removed: it was Followed / (Followed + Missed), already visible in the bar,
// and on a lightly logged day it read as a misleadingly high number.

const STRIPES = 'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'
const SWATCH_STRIPES =
  'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 3px, var(--color-unknown-stripe-b) 3px 6px)'

const card = 'mx-4 flex flex-col gap-2.5 rounded-24 border border-line bg-card px-[18px] pt-4 pb-[18px]'

function LegendRow({
  swatch,
  name,
  note,
  percent,
  first = false,
}: {
  swatch: React.CSSProperties
  name: string
  note: string
  percent: number
  first?: boolean
}) {
  return (
    <div className={`flex min-h-9 items-center gap-2.5 text-13-5 ${first ? '' : 'border-t border-line'}`}>
      <span aria-hidden="true" className="box-border size-3 shrink-0 rounded-4" style={swatch} />
      <span className="flex-1 font-bold">{name}</span>
      <span className="font-medium text-muted">{note}</span>
      <span className="w-10 text-right font-extrabold">{percent}%</span>
    </div>
  )
}

/**
 * The day split into Followed, Missed and Unknown (always 100% together). A day that is fully logged
 * has no Unknown, so it shows one number. (The "Real result" range was taken off the screen for now;
 * scoreDay still works it out.)
 */
export function DayScoreCard({ score }: { score: DayScore<Occurrence> }) {
  const { status, percents, logged } = score
  const complete = status === 'complete'
  const none = status === 'empty' || status === 'nothing-logged'

  const bigNumber = complete && logged !== null ? `${toPercent(logged)}%` : none ? '–' : `${percents.followed}%`
  const caption =
    status === 'empty' ? 'nothing to score' : status === 'nothing-logged' ? 'nothing logged yet' : 'followed'

  const parts = [
    { id: 'followed', pct: percents.followed, style: { background: 'var(--color-followed)' } },
    { id: 'missed', pct: percents.missed, style: { background: 'var(--color-missed)' } },
    { id: 'unknown', pct: percents.unknown, style: { background: STRIPES } },
  ].filter((p) => p.pct > 0)

  return (
    <section aria-labelledby="day-h" className={`${card} mt-3`}>
      <h2 id="day-h" className="m-0 font-sans text-13 font-bold text-muted">
        Day score
      </h2>
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-48 leading-none font-bold tracking-[-0.02em]">{bigNumber}</span>
        <span className={`text-15 font-bold ${none ? 'text-muted' : 'text-primary'}`}>{caption}</span>
      </div>

      <div className="mt-0.5">
        <div aria-hidden="true" className="flex h-[18px] gap-0.5" data-day-bar>
          {parts.length === 0 ? (
            <span className="flex-1 rounded-6" style={{ background: STRIPES }} />
          ) : (
            parts.map((part, index) => (
              <span
                key={part.id}
                data-part={part.id}
                style={{
                  flex: part.pct,
                  background: part.style.background,
                  borderRadius: `${index === 0 ? 6 : 2}px ${index === parts.length - 1 ? 6 : 2}px ${index === parts.length - 1 ? 6 : 2}px ${index === 0 ? 6 : 2}px`,
                }}
              />
            ))
          )}
        </div>
      </div>

      {complete && (
        <p className="m-0 text-12-5 font-medium text-muted">Every block is logged, so this is the whole day.</p>
      )}

      <p className="m-0 text-12-5 font-semibold text-muted">
        Based on{' '}
        <span className="font-extrabold text-ink">
          {score.loggedMinutes} of {score.plannedMinutes}
        </span>{' '}
        planned minutes logged
      </p>

      <div className="mt-1 flex flex-col">
        <LegendRow
          first
          swatch={{ background: 'var(--color-followed)' }}
          name="Followed"
          note="kept to plan"
          percent={percents.followed}
        />
        <LegendRow
          swatch={{ background: 'var(--color-missed)' }}
          name="Missed"
          note="off-plan or skipped"
          percent={percents.missed}
        />
        {!complete && (
          <LegendRow
            swatch={{ background: SWATCH_STRIPES, border: '1px solid var(--color-unknown-line)' }}
            name="Unknown"
            note="not logged"
            percent={percents.unknown}
          />
        )}
      </div>
    </section>
  )
}
