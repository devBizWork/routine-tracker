import { useEffect } from 'react'

/** Can this browser keep the screen awake? (Screen Wake Lock API, iPhone with iOS 16.4 or later.) */
export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Keeps the screen on while `wanted` is true and the page is visible: asks for a screen wake lock,
 * lets it go when hidden (the phone drops it anyway) and asks again on return.
 */
export function useWakeLock(wanted: boolean) {
  useEffect(() => {
    if (!wanted || !wakeLockSupported()) return
    let lock: WakeLockSentinel | null = null
    let stopped = false

    const request = async () => {
      if (stopped || document.visibilityState !== 'visible' || lock) return
      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => {
          lock = null
        })
      } catch {
        lock = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
      else if (lock) void lock.release().catch(() => undefined)
    }

    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (lock) void lock.release().catch(() => undefined)
    }
  }, [wanted])
}
