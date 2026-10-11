import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `intervalMs`. It also refreshes the moment the app comes
 * back to the foreground (switching back from another app, unlocking the phone), because a
 * page that was asleep in the background cannot keep its own timer running.
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [intervalMs])

  return now
}
