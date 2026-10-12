import { useState } from 'react'
import { ActionSheet } from '../../app/ActionSheet'
import { runningTimers, startTimer, type Occurrence } from '../../data'

/**
 * Starting a timer, with the one-at-a-time rule: if another block's timer is running it asks
 * "Stop Deep work and start Client check-in call?" first. `start` resolves to true once the
 * timer is running. Render `dialog` somewhere in the screen (or in a sheet's `overlay`), and
 * keep the screen behind it blocked while `asking` is true.
 */
export function useStartTimer(onError: (message: string) => void) {
  const [pending, setPending] = useState<{ running: Occurrence; next: Occurrence } | null>(null)

  const start = async (next: Occurrence): Promise<boolean> => {
    try {
      const running = (await runningTimers()).find((o) => o.id !== next.id)
      if (running) {
        setPending({ running, next })
        return false
      }
      await startTimer(next.id)
      return true
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : 'Could not start the timer.')
      return false
    }
  }

  const dialog = pending && (
    <ActionSheet
      title={`Stop ${pending.running.title} and start ${pending.next.title}?`}
      message={`The time ${pending.running.title} has run so far is saved to its log.`}
      actions={[
        {
          label: 'Stop and start',
          onSelect: async () => {
            await startTimer(pending.next.id, { stopOthers: true })
          },
        },
      ]}
      cancelLabel={`Keep ${pending.running.title} running`}
      onClosed={() => setPending(null)}
    />
  )

  return { start, asking: pending !== null, dialog }
}
