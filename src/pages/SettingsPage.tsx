import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../app/PageHeader'
import { APP_VERSION } from '../app/version'
import { DEVELOPER_VISIBLE_KEY, getMeta, setMeta } from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { DeveloperSection } from './settings/DeveloperSection'

const TAPS_NEEDED = 5
/** Taps count only if each one follows the last within this time. */
const TAP_WINDOW_MS = 3000

export function SettingsPage() {
  // Remembered on this device (in the database's per-device notes).
  const stored = useLiveQuery(useCallback(() => getMeta<boolean>(DEVELOPER_VISIBLE_KEY), []))
  const developerVisible = stored === true

  const taps = useRef({ count: 0, last: 0 })
  const [hint, setHint] = useState<string | null>(null)

  // The reminder of how many taps are left fades away if you stop tapping.
  useEffect(() => {
    if (hint === null) return
    const timer = setTimeout(() => setHint(null), TAP_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [hint])

  const onVersionTap = () => {
    const now = Date.now()
    const t = taps.current
    t.count = now - t.last > TAP_WINDOW_MS ? 1 : t.count + 1
    t.last = now

    if (t.count >= TAPS_NEEDED) {
      t.count = 0
      setHint(null)
      void setMeta(DEVELOPER_VISIBLE_KEY, !developerVisible)
    } else if (t.count >= 2) {
      const left = TAPS_NEEDED - t.count
      setHint(`${left} more ${left === 1 ? 'tap' : 'taps'} to ${developerVisible ? 'hide' : 'show'} Developer`)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Settings" />
      {developerVisible && <DeveloperSection />}
      <div className="mt-auto flex flex-col items-center pt-6 pb-4">
        <button
          type="button"
          onClick={onVersionTap}
          className="min-h-11 border-0 bg-transparent px-6 text-12 font-semibold text-muted"
        >
          Version {APP_VERSION}
        </button>
        <p className="m-0 h-4 text-11-5 font-medium text-muted" role="status">
          {hint}
        </p>
      </div>
    </div>
  )
}
