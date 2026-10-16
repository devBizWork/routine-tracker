import { useEffect, useSyncExternalStore } from 'react'
import { getMeta, setMeta } from '../data'
import type { Absence } from '../pages/review/flow'

// Noticing that the app was away (closed, or in the background) so Today can say what passed
// meanwhile. While the app is in front it notes "last seen now" every half minute and the moment
// it goes to the background; when it opens or comes back, the gap since then is the absence.
// The note is kept in the database (meta table), so it survives the app being closed.

const LAST_SEEN_KEY = 'lastSeenAt'
const HEARTBEAT_MS = 30_000
/** A shorter gap is just switching apps for a moment, not "away". */
export const MIN_ABSENCE_MS = 60_000

let pending: Absence | null = null
const listeners = new Set<() => void>()

function setPending(next: Absence | null) {
  pending = next
  for (const listener of listeners) listener()
}

/**
 * The absence the "While you were away" card is about, or null. It stays until dismissed (or
 * handled); a second absence before that is joined onto the first.
 */
export function useAbsence(): Absence | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => pending,
  )
}

/** The card was dismissed (or its blocks were logged): this absence is done with. */
export function clearAbsence() {
  setPending(null)
}

/** Joins a new absence onto one that has not been dealt with yet. */
export function mergeAbsence(current: Absence | null, next: Absence): Absence {
  return current ? { from: Math.min(current.from, next.from), to: Math.max(current.to, next.to) } : next
}

async function noteSeen(now: number) {
  try {
    await setMeta(LAST_SEEN_KEY, now)
  } catch (error) {
    console.error('Could not note the time', error)
  }
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
          setPending(mergeAbsence(pending, { from: lastSeen, to: now }))
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
