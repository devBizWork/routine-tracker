import type { Occurrence } from '../../data'
import { toPercent, type DayScore } from '../../scoring'

// The two score cards at the top of the Day review (design/screens/DayReview.html).

const STRIPES = 'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'
const SWATCH_STRIPES =
  'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 3px, var(--color-unknown-stripe-b) 3px 6px)'

const card = 'mx-4 flex flex-col gap-2.5 rounded-24 border border-line bg-card px-[18px] pt-4 pb-[18px]'

/** "How well you kept to the plan on the blocks you logged", with how much of the plan that covers. */
export function LoggedScoreCard({ score }: { score: DayScore<Occurrence> }) {
  const { logged, loggedMinutes, plannedMinutes, status } = score
  const coverage = plannedMinutes > 0 ? (loggedMinutes / plannedMinutes) * 100 : 0
  const about =
    status === 'empty'
      ? 'Nothing is planned yet, so there is nothing to score.'
      : logged === null
        ? 'Nothing is logged yet, so there is no score.'
        : 'How much of the planned time you spent on plan, on the blocks you logged.'

  return (
    <section aria-labelledby="logged-h" className={`${card} mt-4`}>
      <h2 id="logged-h" className="m-0 font-sans text-13 font-bold text-muted">
        Logged score
      </h2>
      <div className="flex items-center gap-3.5">
        <span className="font-display text-48 leading-none font-bold tracking-[-0.02em]">
          {logged === null ? '–' : `${toPercent(logged)}%`}
        </span>
        <span className="text-13 leading-[1.4] font-medium text-muted">{about}</span>
      </div>
      <div className="mt-0.5 flex flex-col gap-1.5">
        <div aria-hidden="true" className="h-2 rounded-4" style={{ background: STRIPES }}>
          <div className="h-2 rounded-4 bg-ink" style={{ width: `${coverage}%` }} />
        </div>
        <span className="text-12-5 font-semibold text-muted">
          Based on{' '}
          <span className="font-extrabold text-ink">
            {loggedMinutes} of {plannedMinutes}
          </span>{' '}
          planned minutes
        </span>
      </div>
    </section>
  )
}

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
 * The day split into Followed, Missed and Unknown (always 100% together), with the range the real
 * result lies in. A day that is fully logged has no Unknown, so it shows one number and no range.
 */
export function DayScoreCard({ score }: { score: DayScore<Occurrence> }) {
  const { status, percents, range, logged } = score
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

      <div className={`relative mt-0.5 ${complete || status === 'empty' ? '' : 'pt-[30px]'}`}>
        {!complete && status !== 'empty' && (
          <>
            <div className="absolute top-0 right-0 left-1/2 flex justify-end pr-0.5 text-11-5 font-extrabold whitespace-nowrap">
              Real result: {range.low}–{range.high}%
            </div>
            <div
              aria-hidden="true"
              className="absolute top-[18px] box-border h-[7px] rounded-t-3 border-2 border-b-0 border-ink"
              style={{ left: `${range.low}%`, width: `${range.high - range.low}%` }}
            />
          </>
        )}
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
