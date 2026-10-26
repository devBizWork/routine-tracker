import { useCallback, useEffect } from 'react'
import { addDays, getDay, getMeta, setMeta, toDateKey } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { AWAY_KEEP_DAYS, keepRecentAbsences, mergeAbsence, type Absence } from '../pages/review/flow'

// Noticing that the app was away (closed, or in the background) so Today can show what was missed
// meanwhile. While the app is in front it notes "last seen now" every half minute and the moment it
// goes to the background; when it opens or comes back, the gap since then is an absence.
//
// The absences are saved in the database (meta table), so the "While you were away" card survives
// the app being closed and midnight. It goes away only when dismissed, when everything on it has
// been logged, or when everything on it is more than a week old.

const LAST_SEEN_KEY = 'lastSeenAt'
const ABSENCES_KEY = 'awayAbsences'
const HEARTBEAT_MS = 30_000
/** A shorter gap is just switching apps for a moment, not "away". */
export const MIN_ABSENCE_MS = 60_000

async function readAbsences(): Promise<Absence[]> {
  const value = await getMeta<Absence[]>(ABSENCES_KEY)
  return Array.isArray(value) ? value : []
}

/** The saved absences the card is about (the screen follows them as they change). */
export function useAbsences(): Absence[] | undefined {
  return useLiveQuery(useCallback(() => readAbsences(), []))
}

/** The card was dismissed, or there is nothing left on it: forget the absences. */
export async function clearAbsences(): Promise<void> {
  await setMeta(ABSENCES_KEY, [])
}

async function noteSeen(now: number) {
  try {
    await setMeta(LAST_SEEN_KEY, now)
  } catch (error) {
    console.error('Could not note the time', error)
  }
}

/** Makes sure the days an absence covers have their blocks (only the last week matters). */
async function prepareDays(absence: Absence, now: number) {
  const today = toDateKey(new Date(now))
  const oldest = addDays(today, -(AWAY_KEEP_DAYS - 1))
  let date = toDateKey(new Date(absence.from))
  if (date < oldest) date = oldest
  for (; date <= today; date = addDays(date, 1)) await getDay(date)
}

/** Run once, in the app shell. */
export function useAwayTracker() {
  useEffect(() => {
    let checking = false
    const check = async () => {
      if (checking) return
      checking = true
      try {
        const now = Date.now()
        const lastSeen = await getMeta<number>(LAST_SEEN_KEY)
        await noteSeen(now)
        if (typeof lastSeen === 'number' && now - lastSeen >= MIN_ABSENCE_MS) {
          const absence = { from: lastSeen, to: now }
          await prepareDays(absence, now)
          await setMeta(ABSENCES_KEY, keepRecentAbsences(mergeAbsence(await readAbsences(), absence), now))
        }
      } catch (error) {
        console.error('Could not check the time away', error)
      } finally {
        checking = false
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
      else void noteSeen(Date.now())
    }
    const onHide = () => void noteSeen(Date.now())
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void noteSeen(Date.now())
    }, HEARTBEAT_MS)

    void check()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])
}
