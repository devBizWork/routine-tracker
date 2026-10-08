import { useEffect, useRef } from 'react'

const SHOW_MS = 2200

/**
 * A small "Coming soon" note for things that are drawn in the design but not built yet,
 * so no tap is ever dead. Show it by giving it a number that changes with every tap;
 * 0 means hidden. It hides itself after a moment by calling onDone.
 */
export function ComingSoonToast({
  tap,
  onDone,
  message = 'Coming soon',
}: {
  tap: number
  onDone: () => void
  message?: string
}) {
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (tap === 0) return
    const timer = setTimeout(() => onDoneRef.current(), SHOW_MS)
    return () => clearTimeout(timer)
  }, [tap])

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(max(var(--safe-bottom), 12px) + 84px)' }}
    >
      {tap !== 0 && (
        <span className="rounded-full bg-ink px-4 py-2.5 text-13 font-bold text-on-primary">{message}</span>
      )}
    </div>
  )
}
