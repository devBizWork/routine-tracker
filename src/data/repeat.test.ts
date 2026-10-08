import { describe, expect, it } from 'vitest'
import { occursOn } from './repeat'
import type { Repeat, Task } from './types'

// A week to test against: Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10, Sun 11 Oct 2026.
const MON = '2026-10-05'
const TUE = '2026-10-06'
const WED = '2026-10-07'
const THU = '2026-10-08'
const FRI = '2026-10-09'
const SAT = '2026-10-10'
const SUN = '2026-10-11'
const WEEK = [MON, TUE, WED, THU, FRI, SAT, SUN]

function task(repeat: Repeat, extra: Partial<Task> = {}) {
  return {
    startTime: '09:00',
    repeat,
    date: null,
    activeFrom: null,
    activeTo: null,
    ...extra,
  }
}

const on = (t: ReturnType<typeof task>) => WEEK.filter((d) => occursOn(t, d))

describe('repeat rules', () => {
  it('once: only on its own date', () => {
    const t = task({ kind: 'once', days: [] }, { date: WED })
    expect(on(t)).toEqual([WED])
  })

  it('once without a date never appears', () => {
    expect(on(task({ kind: 'once', days: [] }))).toEqual([])
  })

  it('daily: every day', () => {
    expect(on(task({ kind: 'daily', days: [] }))).toEqual(WEEK)
  })

  it('weekdays: Monday to Friday only', () => {
    expect(on(task({ kind: 'weekdays', days: [] }))).toEqual([MON, TUE, WED, THU, FRI])
  })

  it('custom: just the chosen days (0 = Sunday)', () => {
    expect(on(task({ kind: 'custom', days: [6, 0] }))).toEqual([SAT, SUN])
    expect(on(task({ kind: 'custom', days: [1, 3, 5] }))).toEqual([MON, WED, FRI])
    expect(on(task({ kind: 'custom', days: [] }))).toEqual([])
  })
})

describe('activeFrom and activeTo', () => {
  it('includes both end days and nothing outside them', () => {
    const t = task({ kind: 'daily', days: [] }, { activeFrom: TUE, activeTo: THU })
    expect(on(t)).toEqual([TUE, WED, THU])
  })

  it('works with only a start or only an end', () => {
    expect(on(task({ kind: 'daily', days: [] }, { activeFrom: FRI }))).toEqual([FRI, SAT, SUN])
    expect(on(task({ kind: 'daily', days: [] }, { activeTo: MON }))).toEqual([MON])
  })

  it('combines with the repeat days', () => {
    const t = task({ kind: 'weekdays', days: [] }, { activeFrom: THU, activeTo: SUN })
    expect(on(t)).toEqual([THU, FRI])
  })

  it('also limits a one-off task', () => {
    const t = task({ kind: 'once', days: [] }, { date: WED, activeFrom: THU })
    expect(occursOn(t, WED)).toBe(false)
  })

  it('a task active for a single day appears once', () => {
    const t = task({ kind: 'daily', days: [] }, { activeFrom: WED, activeTo: WED })
    expect(on(t)).toEqual([WED])
  })
})

describe('inbox tasks', () => {
  it('never appear on a day, whatever else is set', () => {
    for (const repeat of [
      { kind: 'daily', days: [] },
      { kind: 'weekdays', days: [] },
      { kind: 'custom', days: [0, 1, 2, 3, 4, 5, 6] },
      { kind: 'once', days: [] },
    ] satisfies Repeat[]) {
      expect(on(task(repeat, { startTime: null, date: WED }))).toEqual([])
    }
  })
})
