import { plannedEndMinutes, timeToMinutes, type Occurrence, type Settings, type SoundOverride, type TimeOfDay } from '../data'
import { DEFAULT_CHIME, isChimeId, type SoundKind } from './chimes'

// When sounds play on a day (docs/feature-spec.md, "Task-change sounds"). Pure rules, tested:
// the chime when the planned block changes, the 5-minute warning before the next block, and the
// end-of-task sound, each only when switched on, never in quiet hours, never twice for one moment.

export interface SoundEvent {
  /** Minutes after midnight. */
  at: number
  kind: SoundKind
  chimeId: string
  /** Unique for the day: "change@540", so the same moment never plays twice. */
  key: string
}

/** The chime a block uses: its task's own choice, or the app default; null when the task is Silent. */
export function chimeFor(override: SoundOverride | undefined, defaultChime: string): string | null {
  if (override === 'silent') return null
  if (override && isChimeId(override)) return override
  return isChimeId(defaultChime) ? defaultChime : DEFAULT_CHIME
}

/** Is this minute inside quiet hours? Quiet hours may cross midnight (10:00 pm to 7:00 am). */
export function inQuietHours(minute: number, quiet: Settings['quietHours']): boolean {
  if (!quiet.on) return false
  const from = timeToMinutes(quiet.from)
  const to = timeToMinutes(quiet.to)
  if (from === to) return false
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440
  return from < to ? m >= from && m < to : m >= from || m < to
}

const PRIORITY: Record<SoundKind, number> = { change: 3, end: 2, warning: 1 }

/**
 * Every sound the day should make, in time order. Where two land on the same minute only the most
 * important plays: a block change beats an end, which beats a warning.
 * @param overrides each task's sound choice, by task id
 */
export function daySounds(
  blocks: readonly Pick<Occurrence, 'taskId' | 'plannedStart' | 'plannedMinutes'>[],
  settings: Pick<Settings, 'soundsOn' | 'chimeId' | 'warn5min' | 'endSound' | 'quietHours'>,
  overrides: ReadonlyMap<string, SoundOverride>,
): SoundEvent[] {
  if (!settings.soundsOn) return []
  const byMinute = new Map<number, SoundEvent>()
  const add = (at: number, kind: SoundKind, chimeId: string | null) => {
    if (chimeId === null || at < 0 || at >= 1440 || inQuietHours(at, settings.quietHours)) return
    const current = byMinute.get(at)
    if (current && PRIORITY[current.kind] >= PRIORITY[kind]) return
    byMinute.set(at, { at, kind, chimeId, key: `${kind}@${at}` })
  }
  for (const b of blocks) {
    if (b.plannedMinutes <= 0) continue
    const chime = chimeFor(overrides.get(b.taskId), settings.chimeId)
    const start = timeToMinutes(b.plannedStart)
    add(start, 'change', chime)
    if (settings.warn5min) add(start - 5, 'warning', chime)
    if (settings.endSound) add(plannedEndMinutes(b), 'end', chime)
  }
  return [...byMinute.values()].sort((a, b) => a.at - b.at)
}

/**
 * The sounds due between the last check and now (minutes after midnight, with fractions). A gap
 * longer than `maxGap` minutes means the app was hidden or asleep: those moments passed silently
 * (the While you were away card covers them), so nothing plays. Already played keys are skipped.
 */
export function dueSounds(
  events: readonly SoundEvent[],
  lastCheck: number,
  now: number,
  played: ReadonlySet<string>,
  maxGap = 1.5,
): SoundEvent[] {
  if (now <= lastCheck || now - lastCheck > maxGap) return []
  return events.filter((e) => e.at > lastCheck && e.at <= now && !played.has(e.key))
}

/** "10:00 pm" style check helper for the Settings screen: quiet hours that make no sense. */
export function quietHoursProblem(from: TimeOfDay, to: TimeOfDay): string | null {
  return from === to ? 'From and Until are the same time, so quiet hours do nothing.' : null
}
