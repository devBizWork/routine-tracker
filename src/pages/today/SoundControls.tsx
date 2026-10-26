import { useEffect, useRef } from 'react'

// The sound controls on Today (design/screens/States.html, TodayMuted.html, WelcomeBack.html):
// the header button with its three states, the "Tap to turn on sounds" banner, and the
// "Sounds muted" toast with Undo.

/** on: sounds play. muted: you turned them off. needs-tap: iPhone is holding audio back until a tap. */
export type SoundButtonState = 'on' | 'muted' | 'needs-tap'

const speaker = (
  <>
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
    <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
  </>
)
const speakerMuted = (
  <>
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </>
)

function SpeakerIcon({ muted, size = 20 }: { muted: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={muted ? 2 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {muted ? speakerMuted : speaker}
    </svg>
  )
}

export function SoundButton({ state, onTap }: { state: SoundButtonState; onTap: () => void }) {
  const label =
    state === 'muted'
      ? 'Sounds muted. Unmute'
      : state === 'needs-tap'
        ? 'Sounds are waiting for a tap. Turn on sounds'
        : 'Mute sounds'
  const look =
    state === 'muted'
      ? 'border-missed-line bg-missed-soft text-missed-text'
      : state === 'needs-tap'
        ? 'border-line bg-card text-muted'
        : 'border-line bg-card text-primary'
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state === 'muted'}
      onClick={onTap}
      className={`relative box-border flex size-11 shrink-0 items-center justify-center rounded-22 border p-0 ${look}`}
    >
      <SpeakerIcon muted={state === 'muted'} />
      {state === 'needs-tap' && (
        <span aria-hidden="true" className="absolute top-0.5 right-0.5 box-border size-3 rounded-6 border-2 border-card bg-aqua" />
      )}
    </button>
  )
}

/** Shown on Today while sounds are on but iPhone has not let audio play yet. */
export function SoundBanner({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="mx-4 mt-3 flex min-h-[60px] shrink-0 items-center gap-3 rounded-22 border-0 bg-pill py-2 pr-2.5 pl-2 text-left text-ink"
    >
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <SpeakerIcon muted={false} />
      </span>
      <span className="flex flex-1 flex-col gap-px">
        <span className="text-15 font-extrabold text-primary">Tap to turn on sounds</span>
        <span className="text-12-5 font-semibold">iPhone needs one tap before chimes can play</span>
      </span>
    </button>
  )
}

const TOAST_MS = 5000

/** "Sounds muted" with Undo, at the bottom of Today. `tap` changes each time it should show; 0 hides it. */
export function MutedToast({ tap, onUndo, onDone }: { tap: number; onUndo: () => void; onDone: () => void }) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    if (tap === 0) return
    const timer = setTimeout(() => done.current(), TOAST_MS)
    return () => clearTimeout(timer)
  }, [tap])

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(max(var(--safe-bottom), 12px) + 84px)' }}
    >
      {tap !== 0 && (
        <span className="pointer-events-auto flex h-11 items-center gap-2.5 rounded-22 bg-ink pr-1.5 pl-4 whitespace-nowrap text-ground shadow-toast">
          <SpeakerIcon muted size={18} />
          <span className="text-13-5 font-bold">Sounds muted</span>
          <button
            type="button"
            onClick={onUndo}
            className="h-11 rounded-22 border-0 bg-pill px-3 text-13 font-extrabold text-primary"
          >
            Undo
          </button>
        </span>
      )}
    </div>
  )
}
