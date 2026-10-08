import Dexie, { type EntityTable, type Table } from 'dexie'
import { defaultSettings } from './defaults'
import type { DayRecord, MetaRecord, Occurrence, Settings, Task } from './types'

export const DB_NAME = 'routine-tracker'
/** The settings live in one row stored under this key. */
export const SETTINGS_KEY = 'main'

export class RoutineDb extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  occurrences!: EntityTable<Occurrence, 'id'>
  /** Which dates already have their occurrences created. */
  days!: EntityTable<DayRecord, 'date'>
  /** A single row (key SETTINGS_KEY). The key is stored outside the record. */
  settings!: Table<Settings, string>
  meta!: EntityTable<MetaRecord, 'key'>

  constructor(name: string = DB_NAME) {
    super(name)

    // To change the shape of the data later, add version(2) here with an upgrade step.
    // Never edit version(1): phones that already have it need the step-by-step path.
    this.version(1).stores({
      tasks: 'id, startTime, createdAt',
      // "&[taskId+date]" is a safety net: one task can never have two blocks on one day.
      occurrences: 'id, date, taskId, &[taskId+date]',
      days: 'date',
      settings: '',
      meta: 'key',
    })

    // First launch: create the default settings.
    this.on('populate', (tx) => {
      tx.table('settings').add(defaultSettings(), SETTINGS_KEY)
    })
  }
}
