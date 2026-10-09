import { DEFAULT_CATEGORY } from './categories'
import { defaultSettings } from './defaults'
import { RoutineDb, SETTINGS_KEY } from './db'
import { addDays, isDateKey, toDateKey } from './dates'
import { newId } from './ids'
import { occursOn } from './repeat'
import { buildSampleData } from './sample'
import type {
  DateKey,
  Occurrence,
  QuietHours,
  Settings,
  StoragePersistence,
  Task,
  Tolerances,
} from './types'
import { DataError, assertValidOccurrence, assertValidSettings, normalizeTask } from './validate'

/** Everything about a task a screen can set (the id and timestamps are handled here). */
export type TaskFields = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
export type NewTask = Pick<TaskFields, 'title'> & Partial<TaskFields>
export type TaskPatch = Partial<TaskFields>
export type OccurrencePatch = Partial<Omit<Occurrence, 'id' | 'taskId' | 'date'>>
export type SettingsPatch = Partial<Omit<Settings, 'quietHours' | 'tolerances'>> & {
  quietHours?: Partial<QuietHours>
  tolerances?: Partial<Tolerances>
}

/** The bit of navigator.storage we use, so tests can stand in for it. */
export interface StorageLike {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
}

export interface DataApiOptions {
  db?: RoutineDb
  /** The clock. Tests pass a fixed one; the app uses the real time. */
  now?: () => Date
  /** undefined = the browser's own; null = pretend the browser has none. */
  storage?: StorageLike | null
}

const PERSISTENCE_KEY = 'storagePersistence'
export const DEVELOPER_VISIBLE_KEY = 'developerVisible'

/** Removes keys set to undefined, so a patch like { title: undefined } changes nothing. */
function defined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** True while an occurrence has nothing logged on it, so the plan may still change it. */
export function isUnlogged(occ: Occurrence): boolean {
  return (
    occ.status === 'planned' &&
    occ.actualStart === null &&
    occ.actualEnd === null &&
    occ.timerStartedAt === null &&
    occ.note === ''
  )
}

function sortOccurrences(list: Occurrence[]): Occurrence[] {
  return list.sort(
    (a, b) => a.plannedStart.localeCompare(b.plannedStart) || a.title.localeCompare(b.title),
  )
}

function requireDate(date: unknown): DateKey {
  if (!isDateKey(date)) throw new DataError(`Not a valid date: ${String(date)}`)
  return date
}

export function createDataApi(options: DataApiOptions = {}) {
  const db = options.db ?? new RoutineDb()
  const now = options.now ?? (() => new Date())
  const today = (): DateKey => toDateKey(now())

  const storage = (): StorageLike | null => {
    if (options.storage !== undefined) return options.storage
    return typeof navigator !== 'undefined' ? (navigator.storage ?? null) : null
  }

  function occurrenceFor(task: Task, date: DateKey): Occurrence {
    return {
      id: newId(),
      taskId: task.id,
      date,
      title: task.title,
      color: task.color,
      plannedStart: task.startTime ?? '00:00',
      plannedMinutes: task.plannedMinutes,
      status: 'planned',
      actualStart: null,
      actualEnd: null,
      timerStartedAt: null,
      note: '',
    }
  }

  /**
   * Brings the days that already exist, from today on, in line with a task that was just
   * created or changed. This is the ONLY place a task change reaches existing occurrences,
   * and it never looks at dates before today. Blocks that already have a log are left alone.
   * A field is only updated if that day's block still had the task's old value, so a
   * "this day only" change made to one block is not overwritten.
   */
  async function syncFutureDays(
    task: Task,
    previous: Task | null,
    from: DateKey = today(),
  ): Promise<void> {
    const dates = await db.days.where('date').aboveOrEqual(from).primaryKeys()
    for (const date of dates) {
      const existing = await db.occurrences.where('[taskId+date]').equals([task.id, date]).first()
      const shouldAppear = occursOn(task, date)

      if (!existing) {
        if (shouldAppear) await db.occurrences.add(occurrenceFor(task, date))
        continue
      }
      if (!isUnlogged(existing)) continue
      if (!shouldAppear) {
        await db.occurrences.delete(existing.id)
        continue
      }
      if (!previous || task.startTime === null) continue

      const updated = { ...existing }
      if (existing.title === previous.title) updated.title = task.title
      if (existing.color === previous.color) updated.color = task.color
      if (existing.plannedStart === previous.startTime) updated.plannedStart = task.startTime
      if (existing.plannedMinutes === previous.plannedMinutes) {
        updated.plannedMinutes = task.plannedMinutes
      }
      await db.occurrences.put(updated)
    }
  }

  // ---- Tasks ----

  async function listTasks(): Promise<Task[]> {
    return db.tasks.orderBy('createdAt').toArray()
  }

  async function getTask(id: string): Promise<Task | undefined> {
    return db.tasks.get(id)
  }

  async function createTask(input: NewTask): Promise<Task> {
    const at = now().getTime()
    const repeat = input.repeat ?? { kind: 'once', days: [] }
    const task = normalizeTask(
      {
        id: newId(),
        title: input.title,
        color: input.color ?? DEFAULT_CATEGORY,
        startTime: input.startTime ?? null,
        plannedMinutes: input.plannedMinutes ?? 30,
        repeat,
        date: input.date ?? null,
        // A repeating task starts today unless told otherwise, so it never reaches back
        // into days that have already happened.
        activeFrom: input.activeFrom !== undefined ? input.activeFrom : repeat.kind === 'once' ? null : today(),
        activeTo: input.activeTo ?? null,
        soundOverride: input.soundOverride ?? null,
        notes: input.notes ?? '',
        createdAt: at,
        updatedAt: at,
      },
      today(),
    )
    await db.transaction('rw', db.tasks, db.occurrences, db.days, async () => {
      await db.tasks.add(task)
      await syncFutureDays(task, null)
    })
    return task
  }

  /**
   * Changes a task. The change applies from today onward: dates before today keep exactly
   * what they have. (Applying an edit from a chosen later date comes with the Edit sheet.)
   */
  async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return db.transaction('rw', db.tasks, db.occurrences, db.days, async () => {
      const previous = await db.tasks.get(id)
      if (!previous) throw new DataError('That task no longer exists.')

      const changes = defined(patch)
      const becomesRepeating =
        previous.repeat.kind === 'once' && (changes.repeat ?? previous.repeat).kind !== 'once'
      const next = normalizeTask(
        {
          ...previous,
          ...changes,
          // A to-do or one-off that becomes a repeating task starts today, not in the past.
          ...(becomesRepeating && changes.activeFrom === undefined && previous.activeFrom === null
            ? { activeFrom: today() }
            : {}),
          id: previous.id,
          createdAt: previous.createdAt,
          updatedAt: now().getTime(),
        },
        today(),
      )
      await db.tasks.put(next)
      await syncFutureDays(next, previous)
      return next
    })
  }

  /**
   * Deletes a task. Blocks from today onward that have no log are removed with it;
   * earlier days, and anything already logged, stay as they were.
   */
  async function deleteTask(id: string): Promise<void> {
    await db.transaction('rw', db.tasks, db.occurrences, async () => {
      await db.tasks.delete(id)
      const from = today()
      await db.occurrences
        .where('taskId')
        .equals(id)
        .filter((o) => o.date >= from && isUnlogged(o))
        .delete()
    })
  }

  /**
   * "This and future days": changes a repeating task from one date on. The old task ends the
   * day before (activeTo) and a changed copy starts on that date, so earlier days keep their
   * plan and logs. Blocks from that date on that already exist move to the new task: ones with
   * no log follow the change, ones with a log keep it. The date is never earlier than today.
   * If the task only began on or after that date there is nothing to preserve, so it is
   * simply changed in place.
   */
  async function updateTaskFromDate(id: string, patch: TaskPatch, fromDate: DateKey): Promise<Task> {
    requireDate(fromDate)
    const from = fromDate < today() ? today() : fromDate
    return db.transaction('rw', db.tasks, db.occurrences, db.days, async () => {
      const old = await db.tasks.get(id)
      if (!old) throw new DataError('That task no longer exists.')

      // Nothing before `from` to protect: change it where it stands.
      if (old.activeFrom !== null && old.activeFrom >= from) {
        const next = normalizeTask(
          { ...old, ...defined(patch), id: old.id, createdAt: old.createdAt, updatedAt: now().getTime() },
          today(),
        )
        await db.tasks.put(next)
        await syncFutureDays(next, old, from)
        return next
      }

      const at = now().getTime()
      const draft = normalizeTask(
        {
          ...old,
          ...defined(patch),
          id: newId(),
          // The changed version starts on `from` and keeps the old end date.
          activeFrom: from,
          activeTo: old.activeTo,
          createdAt: at,
          updatedAt: at,
        },
        today(),
      )
      // A one-off has no date range of its own.
      const next = draft.repeat.kind === 'once' ? { ...draft, activeFrom: null } : draft

      await db.tasks.put({ ...old, activeTo: addDays(from, -1), updatedAt: at })
      await db.tasks.add(next)
      // Blocks from `from` on belong to the new task (their logs, if any, stay on them).
      await db.occurrences
        .where('taskId')
        .equals(old.id)
        .filter((o) => o.date >= from)
        .modify({ taskId: next.id })
      await syncFutureDays(next, old, from)
      return next
    })
  }

  /**
   * "This day only": changes one date's block of a repeating task and nothing else. Only the
   * title, color, start time and length can differ for a single day; the routine stays as it is.
   */
  async function updateTaskForDay(
    taskId: string,
    date: DateKey,
    patch: Partial<Pick<TaskFields, 'title' | 'color' | 'startTime' | 'plannedMinutes'>>,
  ): Promise<Occurrence> {
    requireDate(date)
    const blocks = await getDay(date) // creates the day first if it is new
    const block = blocks.find((o) => o.taskId === taskId)
    if (!block) throw new DataError('This routine does not run on that day.')
    const changes = defined(patch)
    return updateOccurrence(block.id, {
      ...(changes.title !== undefined ? { title: changes.title.trim() } : {}),
      ...(changes.color !== undefined ? { color: changes.color } : {}),
      ...(changes.startTime != null ? { plannedStart: changes.startTime } : {}),
      ...(changes.plannedMinutes !== undefined ? { plannedMinutes: changes.plannedMinutes } : {}),
    })
  }

  /** How many blocks of this task have a log (done, skipped, a timer or a note). */
  async function taskLogCount(taskId: string): Promise<number> {
    return db.occurrences
      .where('taskId')
      .equals(taskId)
      .filter((o) => !isUnlogged(o))
      .count()
  }

  /**
   * The Delete button. A routine is deleted "from a date on" (today unless told otherwise): it
   * ends the day before, blocks from then on with no log are removed, and earlier days and
   * everything already logged stay. A routine that only began on or after that date has no
   * past to keep, so it is removed outright. A to-do or one-off is removed; a log it already
   * has stays in history.
   */
  async function deleteTaskFromDate(id: string, fromDate: DateKey = today()): Promise<void> {
    requireDate(fromDate)
    const from = fromDate < today() ? today() : fromDate
    await db.transaction('rw', db.tasks, db.occurrences, async () => {
      const task = await db.tasks.get(id)
      if (!task) return
      const hasPast = task.repeat.kind !== 'once' && (task.activeFrom === null || task.activeFrom < from)
      if (hasPast) {
        const lastDay = addDays(from, -1)
        const activeTo = task.activeTo !== null && task.activeTo < lastDay ? task.activeTo : lastDay
        await db.tasks.put({ ...task, activeTo, updatedAt: now().getTime() })
      } else {
        await db.tasks.delete(id)
      }
      await db.occurrences
        .where('taskId')
        .equals(id)
        .filter((o) => o.date >= from && isUnlogged(o))
        .delete()
    })
  }

  // ---- Days ----

  /**
   * The occurrences for one date. The first time a date is asked for, its blocks are
   * created from the tasks that apply that day and stored; after that they are only read.
   */
  async function getDay(date: DateKey): Promise<Occurrence[]> {
    requireDate(date)
    return db.transaction('rw', db.tasks, db.occurrences, db.days, async () => {
      if (!(await db.days.get(date))) {
        const tasks = await db.tasks.toArray()
        const created = tasks.filter((t) => occursOn(t, date)).map((t) => occurrenceFor(t, date))
        await db.occurrences.bulkAdd(created)
        await db.days.add({ date, createdAt: now().getTime() })
      }
      return sortOccurrences(await db.occurrences.where('date').equals(date).toArray())
    })
  }

  /** Looks at a date without creating anything. */
  async function peekDay(
    date: DateKey,
  ): Promise<{ created: boolean; occurrences: Occurrence[] }> {
    requireDate(date)
    const created = (await db.days.get(date)) !== undefined
    const occurrences = sortOccurrences(await db.occurrences.where('date').equals(date).toArray())
    return { created, occurrences }
  }

  async function updateOccurrence(id: string, patch: OccurrencePatch): Promise<Occurrence> {
    return db.transaction('rw', db.occurrences, async () => {
      const current = await db.occurrences.get(id)
      if (!current) throw new DataError('That block no longer exists.')
      const next: Occurrence = {
        ...current,
        ...defined(patch),
        id: current.id,
        taskId: current.taskId,
        date: current.date,
      }
      assertValidOccurrence(next)
      await db.occurrences.put(next)
      return next
    })
  }

  // ---- Settings ----

  function withDefaults(row: Partial<Settings>): Settings {
    const base = defaultSettings()
    return {
      ...base,
      ...row,
      quietHours: { ...base.quietHours, ...row.quietHours },
      tolerances: { ...base.tolerances, ...row.tolerances },
    }
  }

  /** Reads the settings without ever writing, so screens can follow them with useLiveQuery. */
  async function readSettings(): Promise<Settings> {
    return withDefaults((await db.settings.get(SETTINGS_KEY)) ?? {})
  }

  async function getSettings(): Promise<Settings> {
    return db.transaction('rw', db.settings, async () => {
      const row = await db.settings.get(SETTINGS_KEY)
      if (row) return withDefaults(row)
      const fresh = defaultSettings()
      await db.settings.put(fresh, SETTINGS_KEY)
      return fresh
    })
  }

  async function updateSettings(patch: SettingsPatch): Promise<Settings> {
    return db.transaction('rw', db.settings, async () => {
      const current = withDefaults((await db.settings.get(SETTINGS_KEY)) ?? {})
      const { quietHours, tolerances, ...rest } = patch
      const next: Settings = {
        ...current,
        ...defined(rest),
        quietHours: { ...current.quietHours, ...defined(quietHours ?? {}) },
        tolerances: { ...current.tolerances, ...defined(tolerances ?? {}) },
      }
      assertValidSettings(next)
      await db.settings.put(next, SETTINGS_KEY)
      return next
    })
  }

  // ---- Per-device notes and storage ----

  async function getMeta<T>(key: string): Promise<T | undefined> {
    return (await db.meta.get(key))?.value as T | undefined
  }

  async function setMeta(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value })
  }

  async function getStoragePersistence(): Promise<StoragePersistence | undefined> {
    return getMeta<StoragePersistence>(PERSISTENCE_KEY)
  }

  /** Asks the browser to keep our data even when the phone runs low on space, and records the answer. */
  async function requestPersistentStorage(): Promise<StoragePersistence> {
    const checkedAt = now().getTime()
    const manager = storage()
    let result: StoragePersistence
    if (!manager || typeof manager.persist !== 'function') {
      result = { supported: false, persisted: false, checkedAt }
    } else {
      let persisted: boolean
      try {
        persisted = (await manager.persisted?.()) ?? false
        if (!persisted) persisted = await manager.persist()
      } catch {
        persisted = false
      }
      result = { supported: true, persisted, checkedAt }
    }
    await setMeta(PERSISTENCE_KEY, result)
    return result
  }

  // ---- Start-up and developer tools ----

  /** Opens the database, makes sure the settings exist, and asks for persistent storage. */
  async function initData(): Promise<StoragePersistence> {
    await db.open()
    await getSettings()
    return requestPersistentStorage()
  }

  async function counts(): Promise<{ tasks: number; occurrences: number; days: number }> {
    const [tasks, occurrences, days] = await Promise.all([
      db.tasks.count(),
      db.occurrences.count(),
      db.days.count(),
    ])
    return { tasks, occurrences, days }
  }

  /** Deletes tasks, blocks and settings (settings go back to their defaults). */
  async function eraseAllData(): Promise<void> {
    await db.transaction('rw', db.tasks, db.occurrences, db.days, db.settings, async () => {
      await db.tasks.clear()
      await db.occurrences.clear()
      await db.days.clear()
      await db.settings.clear()
      await db.settings.put(defaultSettings(), SETTINGS_KEY)
    })
  }

  /** Replaces all tasks and blocks with the sample set. Settings are left as they are. */
  async function loadSampleData(): Promise<void> {
    const sample = buildSampleData(today(), now().getTime())
    await db.transaction('rw', db.tasks, db.occurrences, db.days, async () => {
      await db.tasks.clear()
      await db.occurrences.clear()
      await db.days.clear()
      await db.tasks.bulkAdd(sample.tasks)
      await db.occurrences.bulkAdd(sample.occurrences)
      await db.days.bulkAdd(sample.days)
    })
  }

  return {
    db,
    today,
    listTasks,
    getTask,
    createTask,
    updateTask,
    updateTaskFromDate,
    updateTaskForDay,
    deleteTask,
    deleteTaskFromDate,
    taskLogCount,
    getDay,
    peekDay,
    updateOccurrence,
    getSettings,
    readSettings,
    updateSettings,
    getMeta,
    setMeta,
    getStoragePersistence,
    requestPersistentStorage,
    initData,
    counts,
    eraseAllData,
    loadSampleData,
  }
}

export type DataApi = ReturnType<typeof createDataApi>
