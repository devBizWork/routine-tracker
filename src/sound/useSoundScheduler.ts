import { useCallback, useEffect, useRef } from 'react'
import { listTasks, peekDay, readSettings, toDateKey, type SoundOverride } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { playSound } from './audio'
import { daySounds, dueSounds, type SoundEvent } from './schedule'

const TICK_MS = 1000

/**
 * Plays the day's sounds while the app is visible (run once, in the app shell). It checks every
 * second; moments that passed while the app was hidden are not played afterwards.
 */
export function useSoundScheduler() {
  const settings = useLiveQuery(readSettings)
  const tasks = useLiveQuery(listTasks)
  const date = toDateKey(new Date())
  const day = useLiveQuery(useCallback(() => peekDay(date), [date]))

  // The latest sounds of the day, kept in a ref so the ticking timer always sees them.
  const events = useRef<{ date: string; list: SoundEvent[] }>({ date, list: [] })
  useEffect(() => {
    if (!settings || !tasks || !day) return
    const overrides = new Map<string, SoundOverride>(tasks.map((t) => [t.id, t.soundOverride]))
    events.current = { date, list: daySounds(day.occurrences, settings, overrides) }
  }, [settings, tasks, day, date])

  useEffect(() => {
    let lastCheck: number | null = null
    let lastDate = ''
    let played = new Set<string>()

    const minutesNow = () => {
      const now = new Date()
      return { date: toDateKey(now), minute: now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 }
    }

    const tick = () => {
      if (document.visibilityState !== 'visible') {
        lastCheck = null
        return
      }
      const now = minutesNow()
      if (now.date !== lastDate) {
        // A new day: start fresh (nothing from before midnight is played).
        lastDate = now.date
        played = new Set()
        lastCheck = now.minute
        return
      }
      if (lastCheck === null || events.current.date !== now.date) {
        lastCheck = now.minute
        return
      }
      const due = dueSounds(events.current.list, lastCheck, now.minute, played)
      lastCheck = now.minute
      // Only the latest one plays if several are due at once.
      const sound = due[due.length - 1]
      for (const e of due) played.add(e.key)
      if (sound) playSound(sound.chimeId, sound.kind)
    }

    const onVisibility = () => {
      // Coming back: start counting from now, so nothing missed while hidden plays late.
      lastCheck = null
      tick()
    }

    const timer = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
    tick()
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
