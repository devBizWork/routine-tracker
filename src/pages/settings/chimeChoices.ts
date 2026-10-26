import { CHIMES, chimeName } from '../../sound/chimes'

/** One choice in a chime list: a chime id, or for a task also 'default' and 'silent'. */
export interface ChimeChoice {
  value: string
  name: string
  description?: string
  /** The chime it plays when tapped (none for Silent). */
  preview?: string
}

/** The app's chimes as choices (Settings > Chime). */
export const CHIME_CHOICES: readonly ChimeChoice[] = CHIMES.map((c) => ({
  value: c.id,
  name: c.name,
  description: c.description,
  preview: c.id,
}))

/** The value the task sheet uses for "follow the app's chime" (stored as null). */
export const APP_DEFAULT = 'default'

/** A task's choices: the app default (naming it), every chime, or Silent. */
export function taskChimeChoices(appChime: string): ChimeChoice[] {
  return [
    { value: APP_DEFAULT, name: 'App default', description: chimeName(appChime), preview: appChime },
    ...CHIME_CHOICES,
    { value: 'silent', name: 'Silent', description: 'No sound for this task' },
  ]
}

/** "App default · Bamboo", "Marimba" or "Silent", for the task sheet's chime row. */
export function taskChimeLabel(override: string | null, appChime: string): string {
  if (override === null) return `App default · ${chimeName(appChime)}`
  if (override === 'silent') return 'Silent'
  return chimeName(override)
}
