// The built-in sounds, made on the phone with the Web Audio API: no audio files, nothing to
// download, so they work offline. Each sound is a few short notes with a soft start and a decay.

export interface ChimeInfo {
  id: string
  name: string
  description: string
}

/** The chimes you can pick. Bamboo is the default (Settings chimeId 'bamboo'). */
export const CHIMES: readonly ChimeInfo[] = [
  { id: 'bamboo', name: 'Bamboo', description: 'Two soft wooden notes' },
  { id: 'bell', name: 'Bell', description: 'A clear bell' },
  { id: 'marimba', name: 'Marimba', description: 'Three warm notes going up' },
  { id: 'glass', name: 'Glass', description: 'A high, bright ping' },
]

export const DEFAULT_CHIME = 'bamboo'

export function chimeName(id: string): string {
  return CHIMES.find((c) => c.id === id)?.name ?? 'Bamboo'
}

export function isChimeId(id: string): boolean {
  return CHIMES.some((c) => c.id === id)
}

/** What kind of moment a sound marks. */
export type SoundKind = 'change' | 'warning' | 'end'

export interface Note {
  /** Pitch in hertz. */
  freq: number
  /** Seconds after the sound starts. */
  at: number
  /** How long it rings, in seconds. */
  length: number
  type: OscillatorType
  /** Loudness, 0 to 1 (kept low: these are gentle). */
  gain: number
}

const CHIME_NOTES: Record<string, Note[]> = {
  bamboo: [
    { freq: 784, at: 0, length: 0.5, type: 'sine', gain: 0.32 },
    { freq: 1046.5, at: 0.16, length: 0.7, type: 'sine', gain: 0.28 },
  ],
  bell: [
    { freq: 880, at: 0, length: 1.4, type: 'sine', gain: 0.3 },
    { freq: 1760, at: 0, length: 0.9, type: 'sine', gain: 0.08 },
    { freq: 2637, at: 0, length: 0.5, type: 'sine', gain: 0.04 },
  ],
  marimba: [
    { freq: 523.25, at: 0, length: 0.35, type: 'triangle', gain: 0.32 },
    { freq: 659.25, at: 0.13, length: 0.35, type: 'triangle', gain: 0.3 },
    { freq: 783.99, at: 0.26, length: 0.55, type: 'triangle', gain: 0.3 },
  ],
  glass: [
    { freq: 1568, at: 0, length: 0.9, type: 'sine', gain: 0.22 },
    { freq: 3136, at: 0, length: 0.4, type: 'sine', gain: 0.05 },
  ],
}

/**
 * The notes for a sound. A block change plays the chime; the 5-minute warning is a single, quieter
 * note of it; the end-of-task sound is the chime's notes going down.
 */
export function notesFor(chimeId: string, kind: SoundKind): Note[] {
  const chime = CHIME_NOTES[chimeId] ?? CHIME_NOTES[DEFAULT_CHIME] ?? []
  if (kind === 'change') return chime
  if (kind === 'warning') {
    const first = chime[0]
    return first ? [{ ...first, at: 0, gain: first.gain * 0.6, length: Math.min(first.length, 0.45) }] : []
  }
  // End: the same notes, highest first, a little slower.
  const sorted = [...chime].sort((a, b) => b.freq - a.freq)
  return sorted.map((n, i) => ({ ...n, at: i * 0.2 }))
}

/** Plays the notes on an audio context that is already running. */
export function playNotes(ctx: AudioContext, notes: readonly Note[]) {
  const start = ctx.currentTime + 0.02
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = n.type
    osc.frequency.value = n.freq
    const t = start + n.at
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(n.gain, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + n.length)
    osc.connect(env).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + n.length + 0.05)
  }
}
