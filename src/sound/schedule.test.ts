import { describe, expect, it } from 'vitest'
import { CHIMES, chimeName, DEFAULT_CHIME, isChimeId, notesFor } from './chimes'
import { chimeFor, daySounds, dueSounds, inQuietHours, quietHoursProblem } from './schedule'

const SETTINGS = {
  soundsOn: true,
  chimeId: 'bamboo',
  warn5min: true,
  endSound: false,
  quietHours: { on: false, from: '22:00', to: '07:00' },
}

const block = (taskId: string, start: string, minutes: number) => ({ taskId, plannedStart: start, plannedMinutes: minutes })
const hm = (h: number, m = 0) => h * 60 + m
const NO_OVERRIDES = new Map<string, string | null>()

describe('the chimes', () => {
  it('there are four, Bamboo is the default', () => {
    expect(CHIMES).toHaveLength(4)
    expect(DEFAULT_CHIME).toBe('bamboo')
    expect(chimeName('bamboo')).toBe('Bamboo')
    expect(isChimeId('marimba')).toBe(true)
    expect(isChimeId('trumpet')).toBe(false)
  })

  it('every chime has notes for a change, a warning and an end', () => {
    for (const c of CHIMES) {
      expect(notesFor(c.id, 'change').length).toBeGreaterThan(0)
      expect(notesFor(c.id, 'warning')).toHaveLength(1)
      expect(notesFor(c.id, 'end').length).toBe(notesFor(c.id, 'change').length)
    }
  })

  it('an unknown chime falls back to Bamboo', () => {
    expect(notesFor('nope', 'change')).toEqual(notesFor('bamboo', 'change'))
  })
})

describe('which chime a block uses', () => {
  it('the app chime, the task’s own chime, or nothing when the task is Silent', () => {
    expect(chimeFor(null, 'bell')).toBe('bell')
    expect(chimeFor(undefined, 'bell')).toBe('bell')
    expect(chimeFor('marimba', 'bell')).toBe('marimba')
    expect(chimeFor('silent', 'bell')).toBeNull()
    expect(chimeFor('nope', 'bell')).toBe('bell')
    expect(chimeFor(null, 'nope')).toBe('bamboo')
  })
})

describe('quiet hours', () => {
  const night = { on: true, from: '22:00', to: '07:00' }

  it('cross midnight', () => {
    expect(inQuietHours(hm(23), night)).toBe(true)
    expect(inQuietHours(hm(0, 30), night)).toBe(true)
    expect(inQuietHours(hm(6, 59), night)).toBe(true)
    expect(inQuietHours(hm(7), night)).toBe(false)
    expect(inQuietHours(hm(21, 59), night)).toBe(false)
    expect(inQuietHours(hm(22), night)).toBe(true)
  })

  it('within one day', () => {
    const lunch = { on: true, from: '12:00', to: '13:00' }
    expect(inQuietHours(hm(12, 30), lunch)).toBe(true)
    expect(inQuietHours(hm(13), lunch)).toBe(false)
  })

  it('off, or From equal to Until, means never quiet', () => {
    expect(inQuietHours(hm(23), { ...night, on: false })).toBe(false)
    expect(inQuietHours(hm(23), { on: true, from: '09:00', to: '09:00' })).toBe(false)
    expect(quietHoursProblem('09:00', '09:00')).not.toBeNull()
    expect(quietHoursProblem('22:00', '07:00')).toBeNull()
  })
})

describe('the sounds of a day', () => {
  const day = [block('a', '09:00', 60), block('b', '10:00', 30), block('c', '12:00', 30)]

  it('a chime at each block start and a warning 5 minutes before', () => {
    expect(daySounds(day, SETTINGS, NO_OVERRIDES).map((e) => `${e.kind}@${e.at}`)).toEqual([
      `warning@${hm(8, 55)}`,
      `change@${hm(9)}`,
      `warning@${hm(9, 55)}`,
      `change@${hm(10)}`,
      `warning@${hm(11, 55)}`,
      `change@${hm(12)}`,
    ])
  })

  it('the warning and the end sound only when switched on', () => {
    const plain = daySounds(day, { ...SETTINGS, warn5min: false }, NO_OVERRIDES)
    expect(plain.every((e) => e.kind === 'change')).toBe(true)
    const withEnd = daySounds(day, { ...SETTINGS, warn5min: false, endSound: true }, NO_OVERRIDES)
    expect(withEnd.filter((e) => e.kind === 'end').map((e) => e.at)).toEqual([hm(10, 30), hm(12, 30)])
  })

  it('a block change beats an end at the same minute (9:00 to 10:00, then 10:00), so it plays once', () => {
    const sounds = daySounds(day, { ...SETTINGS, endSound: true }, NO_OVERRIDES)
    const at10 = sounds.filter((e) => e.at === hm(10))
    expect(at10).toHaveLength(1)
    expect(at10[0]?.kind).toBe('change')
  })

  it('nothing when sounds are off', () => {
    expect(daySounds(day, { ...SETTINGS, soundsOn: false }, NO_OVERRIDES)).toEqual([])
  })

  it('nothing in quiet hours', () => {
    const late = [block('a', '22:30', 30), block('b', '21:00', 30)]
    const sounds = daySounds(late, { ...SETTINGS, quietHours: { on: true, from: '22:00', to: '07:00' } }, NO_OVERRIDES)
    expect(sounds.map((e) => e.at)).toEqual([hm(20, 55), hm(21)])
  })

  it('follows each task’s own chime, and a Silent task makes no sound', () => {
    const overrides = new Map<string, string | null>([
      ['a', 'glass'],
      ['b', 'silent'],
    ])
    const sounds = daySounds(day, { ...SETTINGS, warn5min: false }, overrides)
    expect(sounds.map((e) => [e.at, e.chimeId])).toEqual([
      [hm(9), 'glass'],
      [hm(12), 'bamboo'],
    ])
  })
})

describe('playing at the right moment', () => {
  const events = daySounds([block('a', '09:00', 60), block('b', '10:00', 30)], SETTINGS, NO_OVERRIDES)

  it('plays a sound when its minute arrives', () => {
    expect(dueSounds(events, hm(8, 59.9), hm(9, 0.1), new Set()).map((e) => e.key)).toEqual([`change@${hm(9)}`])
  })

  it('never twice for the same moment', () => {
    expect(dueSounds(events, hm(8, 59.9), hm(9, 0.1), new Set([`change@${hm(9)}`]))).toEqual([])
  })

  it('moments missed while the app was hidden are not played afterwards', () => {
    // Last check at 8:50, now 10:05 (the app was in the background): a long gap plays nothing.
    expect(dueSounds(events, hm(8, 50), hm(10, 5), new Set())).toEqual([])
  })

  it('nothing between checks with no moment in them', () => {
    expect(dueSounds(events, hm(9, 1), hm(9, 2), new Set())).toEqual([])
  })
})
