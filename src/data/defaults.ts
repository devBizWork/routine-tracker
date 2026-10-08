import type { Settings } from './types'

// What a fresh install starts with. Values match the Settings screen design.
export const DEFAULT_SETTINGS: Settings = {
  soundsOn: true,
  chimeId: 'bamboo',
  warn5min: true,
  endSound: false,
  quietHours: { on: true, from: '22:00', to: '07:00' },
  keepScreenOn: false,
  dayStart: '05:00',
  dayEnd: '23:00',
  timeFormat: '12h',
  tolerances: { onTimeMin: 10, lengthPct: 10, zeroCreditMin: 60 },
  lastBackupAt: null,
  backupReminderDays: 7,
  installPromptDismissed: false,
}

/** A fresh copy, so nobody can change the defaults by accident. */
export function defaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS)
}
