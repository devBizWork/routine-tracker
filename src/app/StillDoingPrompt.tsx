import { useEffect, useState } from 'react'
import {
  formatMinutesAsTime,
  formatTime,
  needsStillDoing,
  plannedEndMinutes,
  readSettings,
  runningTimers,
  stopTimer,
  timeOfMoment,
} from '../data'
import { useLiveQuery } from '../data/useLiveQuery'
import { ActionSheet } from './ActionSheet'

/** Timers the person chose to keep going. Kept until the app is closed, so it asks again on the next open. */
const keptGoing = new Set<string>()

/**
 * "Still doing Deep work?": a timer still running 2 hours after its block's planned end is asked
 * about when the app is opened (or comes back to the front), not while it is in use. "Stop at
 * planned end" saves the log with the planned end; "Keep going" leaves the timer running.
 */
export function StillDoingPrompt() {
  const timers = useLiveQuery(runningTimers)
  const settings = useLiveQuery(readSettings)
  // The moment the app was opened or last came back to the front.
  const [openedAt, setOpenedAt] = useState(() => Date.now())
  const [, setKeptCount] = useState(0)

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setOpenedAt(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [])

  const due = (timers ?? []).find((o) => !keptGoing.has(o.id) && needsStillDoing(o, openedAt))
  if (!due || due.timerStartedAt === null) return null

  const timeFormat = settings?.timeFormat ?? '12h'
  return (
    <ActionSheet
      key={due.id}
      title={`Still doing ${due.title}?`}
      message={`Its timer started at ${formatTime(timeOfMoment(due.timerStartedAt), timeFormat)}. It was planned to end at ${formatMinutesAsTime(plannedEndMinutes(due), timeFormat)}.`}
      actions={[
        {
          label: 'Stop at planned end',
          onSelect: async () => {
            await stopTimer(due.id, { atPlannedEnd: true })
          },
        },
      ]}
      cancelLabel="Keep going"
      onClosed={(chosen) => {
        if (chosen === null) {
          keptGoing.add(due.id)
          setKeptCount((n) => n + 1)
        }
      }}
    />
  )
}
