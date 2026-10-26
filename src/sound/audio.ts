import { useSyncExternalStore } from 'react'
import { notesFor, playNotes, type SoundKind } from './chimes'

// The one audio context of the app, and whether the phone lets it play. iPhone keeps web audio
// silent until the person taps something; the first tap on any sound control calls unlockAudio(),
// which starts (or wakes) the context. Coming back from the background can lock it again.

type AudioState = 'locked' | 'ready' | 'unsupported'

let ctx: AudioContext | null = null
let state: AudioState = typeof window !== 'undefined' && 'AudioContext' in window ? 'locked' : 'unsupported'
const listeners = new Set<() => void>()

function setState(next: AudioState) {
  if (next === state) return
  state = next
  for (const l of listeners) l()
}

function follow(context: AudioContext) {
  setState(context.state === 'running' ? 'ready' : 'locked')
}

/**
 * Call from a tap (a click handler): starts audio if the phone allows it. Safe to call again.
 * Resolves to true when sounds can play.
 */
export async function unlockAudio(): Promise<boolean> {
  if (state === 'unsupported') return false
  try {
    if (!ctx) {
      ctx = new AudioContext()
      ctx.addEventListener('statechange', () => ctx && follow(ctx))
    }
    if (ctx.state !== 'running') await ctx.resume()
    // A tiny silent sound, which iPhone needs to really open the audio path.
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    follow(ctx)
    return ctx.state === 'running'
  } catch {
    setState('locked')
    return false
  }
}

/** Plays a sound now, if audio is unlocked. Returns false if it could not play. */
export function playSound(chimeId: string, kind: SoundKind = 'change'): boolean {
  if (!ctx || ctx.state !== 'running') {
    if (ctx) follow(ctx)
    return false
  }
  playNotes(ctx, notesFor(chimeId, kind))
  return true
}

/** Tap handler for Test sound and the chime picker: unlocks, then plays. */
export async function previewSound(chimeId: string, kind: SoundKind = 'change') {
  if (await unlockAudio()) playSound(chimeId, kind)
}

/** 'ready' when sounds can play, 'locked' when a tap is needed, 'unsupported' without Web Audio. */
export function useAudioState(): AudioState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}
