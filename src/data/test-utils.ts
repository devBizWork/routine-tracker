// Helpers for the data tests only (not used by the app).
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach } from 'vitest'
import { createDataApi, type DataApiOptions } from './api'
import { RoutineDb } from './db'

const opened: RoutineDb[] = []
let counter = 0

/** A brand-new empty database and API, with a clock you can move (clock.current). */
export function setup(start: Date = new Date(2026, 9, 8, 9, 0), storage?: DataApiOptions['storage']) {
  const clock = { current: start }
  const db = new RoutineDb(`test-db-${++counter}`)
  opened.push(db)
  const api = createDataApi({ db, now: () => clock.current, storage: storage ?? null })
  return { api, db, clock }
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close()
    await Dexie.delete(db.name)
  }
})
