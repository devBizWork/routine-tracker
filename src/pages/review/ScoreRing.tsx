// The small Day score ring (Followed blue, Missed apricot, the rest is the grey track) and the
// three-part day bar (Followed, Missed, Unknown). Used by the Today chip, the Calendar and the Day
// screen, always drawn from the Step 7 percentages.

const STRIPES = 'repeating-linear-gradient(135deg, var(--color-unknown-stripe-a) 0 4px, var(--color-unknown-stripe-b) 4px 8px)'

export function ScoreRing({
  followed,
  missed,
  size = 28,
  stroke = 5,
}: {
  /** Whole percentages. */
  followed: number
  missed: number
  size?: number
  stroke?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      {followed > 0 && (
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="var(--color-followed)"
          strokeWidth={stroke}
          pathLength="100"
          strokeDasharray={`${followed} 100`}
          transform="rotate(-90 18 18)"
        />
      )}
      {missed > 0 && (
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="var(--color-missed)"
          strokeWidth={stroke}
          pathLength="100"
          strokeDasharray={`${missed} 100`}
          strokeDashoffset={-followed}
          transform="rotate(-90 18 18)"
        />
      )}
    </svg>
  )
}

export function DayBar({
  followed,
  missed,
  unknown,
  height = 12,
}: {
  followed: number
  missed: number
  unknown: number
  height?: number
}) {
  const parts = [
    { id: 'followed', pct: followed, background: 'var(--color-followed)' },
    { id: 'missed', pct: missed, background: 'var(--color-missed)' },
    { id: 'unknown', pct: unknown, background: STRIPES },
  ].filter((p) => p.pct > 0)
  const big = height / 2
  return (
    <span aria-hidden="true" className="flex gap-0.5" style={{ height }}>
      {parts.length === 0 ? (
        <span className="flex-1" style={{ background: STRIPES, borderRadius: big }} />
      ) : (
        parts.map((part, index) => {
          const left = index === 0 ? big : 2
          const right = index === parts.length - 1 ? big : 2
          return (
            <span
              key={part.id}
              data-part={part.id}
              style={{ flex: part.pct, background: part.background, borderRadius: `${left}px ${right}px ${right}px ${left}px` }}
            />
          )
        })
      )}
    </span>
  )
}
