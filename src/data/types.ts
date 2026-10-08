// The records stored on the phone. Field names follow the data model in CLAUDE.md.

/** A calendar day as local text, "YYYY-MM-DD". Never UTC. */
export type DateKey = string
/** A wall-clock time as local text, "HH:mm" (24-hour). A 7:00 am block stays 7:00 am. */
export type TimeOfDay = string

/** The category (and so the color) of a task. The colors themselves live in tokens.css. */
export type CategoryId = 'movement' | 'focus' | 'admin' | 'meetings' | 'planning' | 'personal'

export type RepeatKind = 'once' | 'daily' | 'weekdays' | 'custom'

export interface Repeat {
  kind: RepeatKind
  /** Days of the week for "custom": 0 = Sunday ... 6 = Saturday. Empty for the other kinds. */
  days: number[]
}

/** null = use the app default, "silent" = no sound, anything else = a chime id. */
export type SoundOverride = string | null

export interface Task {
  id: string
  title: string
  color: CategoryId
  /** null while the task sits in the inbox (not on the timeline yet). */
  startTime: TimeOfDay | null
  plannedMinutes: number
  repeat: Repeat
  /** The one day of a "once" task. null for repeating tasks and for inbox tasks. */
  date: DateKey | null
  /** First and last day (inclusive) the task can appear. null = no limit. */
  activeFrom: DateKey | null
  activeTo: DateKey | null
  soundOverride: SoundOverride
  notes: string
  /** Moments in time (milliseconds since 1970). */
  createdAt: number
  updatedAt: number
}

export type OccurrenceStatus = 'planned' | 'done' | 'skipped'

/** One task on one date. The plan is copied in so later task edits cannot rewrite history. */
export interface Occurrence {
  id: string
  taskId: string
  date: DateKey
  title: string
  color: CategoryId
  plannedStart: TimeOfDay
  plannedMinutes: number
  status: OccurrenceStatus
  actualStart: TimeOfDay | null
  actualEnd: TimeOfDay | null
  /** When a running timer was started (milliseconds since 1970). The timer is this
   *  saved moment, never a counter, so it survives closing the app. */
  timerStartedAt: number | null
  note: string
}

export interface QuietHours {
  on: boolean
  from: TimeOfDay
  to: TimeOfDay
}

export interface Tolerances {
  /** Minutes late or early that still earn full timing credit. */
  onTimeMin: number
  /** Percent the length may differ and still earn full duration credit. */
  lengthPct: number
  /** Minutes early or late at which timing credit drops to zero. */
  zeroCreditMin: number
}

export interface Settings {
  soundsOn: boolean
  chimeId: string
  warn5min: boolean
  endSound: boolean
  quietHours: QuietHours
  keepScreenOn: boolean
  dayStart: TimeOfDay
  dayEnd: TimeOfDay
  timeFormat: '12h' | '24h'
  tolerances: Tolerances
  /** Moment of the last backup, or null if there has never been one. */
  lastBackupAt: number | null
  backupReminderDays: number
  installPromptDismissed: boolean
}

/** Remembers that a date's occurrences have been created, so it happens only once. */
export interface DayRecord {
  date: DateKey
  createdAt: number
}

/** Small per-device notes that are not user data and are not part of backups. */
export interface MetaRecord {
  key: string
  value: unknown
}

/** What we know about whether the browser promised to keep our storage. */
export interface StoragePersistence {
  /** The browser offers the persistent-storage feature at all. */
  supported: boolean
  /** The browser agreed not to clear our data when space runs low. */
  persisted: boolean
  checkedAt: number
}
