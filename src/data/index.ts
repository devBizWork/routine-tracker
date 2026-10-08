// The one door to the data: screens import from here, never from Dexie directly.
//
//   import { getDay, listTasks, updateOccurrence } from '../data'
//
// Everything below uses the real database and the real clock. Tests build their own
// copy with createDataApi({ db, now }).
import { createDataApi } from './api'

const api = createDataApi()

export const {
  initData,
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getDay,
  peekDay,
  updateOccurrence,
  getSettings,
  updateSettings,
  getMeta,
  setMeta,
  getStoragePersistence,
  requestPersistentStorage,
  counts,
  eraseAllData,
  loadSampleData,
  today,
} = api

export { DEVELOPER_VISIBLE_KEY, createDataApi, isUnlogged } from './api'
export type { DataApi, NewTask, OccurrencePatch, SettingsPatch, TaskPatch } from './api'
export { CATEGORIES, DEFAULT_CATEGORY } from './categories'
export { addDays, dayOfWeek, isDateKey, parseDateKey, toDateKey } from './dates'
export { occursOn } from './repeat'
export { isTimeOfDay, minutesToTime, timeToMinutes } from './time'
export { DataError } from './validate'
export * from './types'
