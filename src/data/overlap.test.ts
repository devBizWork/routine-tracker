import { describe, expect, it } from 'vitest'
import { findOverlaps, overlapMessage } from './overlap'
import type { Repeat, Task } from './types'

// Today is Thursday 8 October 2026. Fri 9, Sat 10, Sun 11.
const TODAY = '2026-10-08'
const daily: Repeat = { kind: 'daily', days: [] }
const weekdays: Repeat = { kind: 'weekdays', days: [] }
const once: Repeat = { kind: 'once', days: [] }

function task(title: string, extra: Partial<Task>): Task {
  return {
    id: title,
    title,
    color: 'focus',
    startTime: '09:00',
    plannedMinutes: 90,
    repeat: weekdays,
    date: null,
    activeFrom: null,
    activeTo: null,
    soundOverride: null,
    notes: '',
    createdAt: 0,
    updatedAt: 0,
    ...extra,
  }
}

const deepWork = task('Deep work', { startTime: '09:00', plannedMinutes: 90, repeat: weekdays })

const names = (list: Task[]) => list.map((t) => t.title)

describe('findOverlaps', () => {
  it('finds a block that shares time on a shared day', () => {
    const hit = findOverlaps({ startTime: '10:00', plannedMinutes: 30, repeat: daily, date: null }, [deepWork], TODAY)
    expect(names(hit)).toEqual(['Deep work'])
  })

  it('does not count blocks that only touch', () => {
    const before = findOverlaps({ startTime: '08:00', plannedMinutes: 60, repeat: daily, date: null }, [deepWork], TODAY)
    const after = findOverlaps({ startTime: '10:30', plannedMinutes: 30, repeat: daily, date: null }, [deepWork], TODAY)
    expect(before).toEqual([])
    expect(after).toEqual([])
  })

  it('needs a shared day, not just shared hours', () => {
    // Deep work is Monday to Friday; a Saturday-and-Sunday block at the same time is fine.
    const weekend = { startTime: '09:30', plannedMinutes: 30, repeat: { kind: 'custom', days: [0, 6] } as Repeat, date: null }
    expect(findOverlaps(weekend, [deepWork], TODAY)).toEqual([])
    const withFriday = { ...weekend, repeat: { kind: 'custom', days: [5, 6] } as Repeat }
    expect(names(findOverlaps(withFriday, [deepWork], TODAY))).toEqual(['Deep work'])
  })

  it('checks the actual day of a one-off block', () => {
    const saturday = { startTime: '09:30', plannedMinutes: 30, repeat: once, date: '2026-10-10' }
    const friday = { ...saturday, date: '2026-10-09' }
    expect(findOverlaps(saturday, [deepWork], TODAY)).toEqual([])
    expect(names(findOverlaps(friday, [deepWork], TODAY))).toEqual(['Deep work'])
  })

  it('checks a one-off task already in the list against a repeating new block', () => {
    const call = task('Client call', { startTime: '10:30', plannedMinutes: 30, repeat: once, date: '2026-10-10' })
    const block = { startTime: '10:00', plannedMinutes: 60, repeat: { kind: 'custom', days: [6] } as Repeat, date: null }
    expect(names(findOverlaps(block, [call], TODAY))).toEqual(['Client call'])
    expect(findOverlaps({ ...block, repeat: { kind: 'custom', days: [0] } }, [call], TODAY)).toEqual([])
  })

  it('respects when the other task stops or starts', () => {
    const ended = task('Old routine', { repeat: daily, activeTo: '2026-10-01' })
    const notYet = task('Future routine', { repeat: daily, activeFrom: '2026-12-01' })
    const block = { startTime: '09:30', plannedMinutes: 30, repeat: daily, date: null }
    expect(findOverlaps(block, [ended], TODAY)).toEqual([])
    // Two repeating tasks that both go on for ever will meet once the later one starts.
    expect(names(findOverlaps(block, [notYet], TODAY))).toEqual(['Future routine'])
  })

  it('ignores inbox tasks', () => {
    const inbox = task('Call the dentist', { startTime: null, repeat: once })
    expect(findOverlaps({ startTime: '09:00', plannedMinutes: 60, repeat: daily, date: null }, [inbox], TODAY)).toEqual([])
  })

  it('lists several overlaps in time order', () => {
    const early = task('Email', { startTime: '08:30', plannedMinutes: 45, repeat: weekdays })
    const hit = findOverlaps({ startTime: '08:00', plannedMinutes: 120, repeat: daily, date: null }, [deepWork, early], TODAY)
    expect(names(hit)).toEqual(['Email', 'Deep work'])
  })
})

describe('overlapMessage', () => {
  const a = task('Deep work', {})
  const b = task('Email', {})
  const c = task('Plan the day', {})

  it('says nothing when there is no overlap', () => {
    expect(overlapMessage([])).toBeNull()
  })

  it('names one, two, or one and a count', () => {
    expect(overlapMessage([a])).toBe('Overlaps Deep work')
    expect(overlapMessage([a, b])).toBe('Overlaps Deep work and Email')
    expect(overlapMessage([a, b, c])).toBe('Overlaps Deep work and 2 more')
  })
})
