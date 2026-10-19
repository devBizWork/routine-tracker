import { describe, expect, it } from 'vitest'
import type { Occurrence, Task } from '../../data'
import { scoreDay } from '../../scoring'
import {
  blocksOn,
  dayInfo,
  firstDataDate,
  gridRange,
  inMonth,
  monthGrid,
  monthOf,
  monthTitle,
  plannedLine,
  rememberCalendar,
  rememberedCalendar,
  shiftMonth,
  weekOf,
  type CalendarData,
} from './month'

const OCT_2026 = { year: 2026, month: 9 }

let counter = 0
function block(date: string, start: string, minutes: number, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: `o${++counter}`,
    taskId: `t${counter}`,
    date,
    title: 'Block',
    color: 'focus',
    plannedStart: start,
    plannedMinutes: minutes,
    status: 'planned',
    actualStart: null,
    actualEnd: null,
    timerStartedAt: null,
    note: '',
    ...patch,
  }
}

function task(patch: Partial<Task>): Task {
  return {
    id: `task${++counter}`,
    title: 'Routine',
    color: 'focus',
    startTime: '09:00',
    plannedMinutes: 60,
    repeat: { kind: 'daily', days: [] },
    date: null,
    activeFrom: null,
    activeTo: null,
    soundOverride: null,
    notes: '',
    createdAt: new Date(2026, 9, 1, 8).getTime(),
    updatedAt: 0,
    ...patch,
  }
}

describe('the month grid', () => {
  it('starts on Monday and covers the whole month (design: Sep 28 to Nov 1 for October 2026)', () => {
    const weeks = monthGrid(OCT_2026)
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks[4]?.[6]).toBe('2026-11-01')
    expect(gridRange(OCT_2026)).toEqual({ from: '2026-09-28', to: '2026-11-01' })
  })

  it('has six weeks when the month needs them', () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(monthGrid({ year: 2026, month: 7 })).toHaveLength(6)
  })

  it('every week has seven days, Monday to Sunday', () => {
    for (const week of monthGrid({ year: 2027, month: 1 })) expect(week).toHaveLength(7)
  })

  it('titles, moving between months, and which days belong to the month', () => {
    expect(monthTitle(OCT_2026)).toBe('October 2026')
    expect(shiftMonth(OCT_2026, 1)).toEqual({ year: 2026, month: 10 })
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(monthOf('2026-10-05')).toEqual(OCT_2026)
    expect(inMonth('2026-10-31', OCT_2026)).toBe(true)
    expect(inMonth('2026-11-01', OCT_2026)).toBe(false)
  })

  it('the week strip is the Monday-to-Sunday week of the day', () => {
    expect(weekOf('2026-10-07')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ])
    expect(weekOf('2026-10-11')[0]).toBe('2026-10-05')
  })
})

describe('what each day shows', () => {
  const blocks = [
    block('2026-10-05', '06:30', 60, { status: 'done', actualStart: '06:30', actualEnd: '07:30' }),
    block('2026-10-05', '09:00', 80, { status: 'done', actualStart: '10:00', actualEnd: '11:20' }),
    block('2026-10-05', '12:00', 20, { status: 'skipped' }),
    block('2026-10-05', '21:00', 40),
  ]
  const data: CalendarData = {
    today: '2026-10-06',
    nowMinutes: 10 * 60,
    created: new Set(['2026-10-05', '2026-10-06']),
    occurrences: [...blocks, block('2026-10-06', '09:00', 60, { status: 'done', actualStart: '09:00', actualEnd: '10:00' }), block('2026-10-06', '13:00', 60)],
    tasks: [task({ createdAt: new Date(2026, 9, 3).getTime() })],
    firstDataDate: '2026-10-03',
  }

  it('a past day: block count, minutes and the Step 7 score (worked example)', () => {
    const info = dayInfo('2026-10-05', data)
    expect(info.kind).toBe('scored')
    if (info.kind !== 'scored') return
    expect(plannedLine(info.blocks, info.minutes)).toBe('4 blocks · 200 min')
    // The very same numbers as scoreDay itself: no separate calculation.
    expect(info.score.percents).toEqual(scoreDay(blocks).percents)
    expect(info.score.percents).toEqual({ followed: 40, missed: 40, unknown: 20 })
  })

  it('today: only blocks that have started count', () => {
    const info = dayInfo('2026-10-06', data)
    expect(info.kind === 'scored' && info.score.plannedMinutes).toBe(60)
    expect(info.kind === 'scored' && info.blocks).toBe(2)
  })

  it('a future day: the planned blocks only, no score', () => {
    expect(dayInfo('2026-10-09', data)).toEqual({ kind: 'future', blocks: 1, minutes: 60 })
  })

  it('days before any data show nothing', () => {
    expect(dayInfo('2026-10-02', data)).toEqual({ kind: 'none' })
    expect(dayInfo('2026-10-02', { ...data, firstDataDate: null })).toEqual({ kind: 'none' })
  })

  it('a past day never opened shows its plan as Unknown, worked out from the tasks without saving anything', () => {
    const info = dayInfo('2026-10-04', data)
    expect(info.kind === 'scored' && info.score.status).toBe('nothing-logged')
    expect(info.kind === 'scored' && info.score.percents.unknown).toBe(100)
    expect(blocksOn('2026-10-04', data)).toHaveLength(1)
  })

  it('a day with nothing planned has an empty score', () => {
    const info = dayInfo('2026-10-04', { ...data, tasks: [] })
    expect(info.kind === 'scored' && info.score.status).toBe('empty')
    expect(plannedLine(0, 0)).toBe('Nothing planned')
  })

  it('one block is written in the singular', () => {
    expect(plannedLine(1, 30)).toBe('1 block · 30 min')
  })
})

describe('the first day with data', () => {
  it('is the earlier of the first opened day and the first task', () => {
    expect(firstDataDate('2026-10-05', [task({ createdAt: new Date(2026, 9, 8).getTime() })])).toBe('2026-10-05')
    expect(firstDataDate('2026-10-05', [task({ createdAt: new Date(2026, 9, 2).getTime() })])).toBe('2026-10-02')
    expect(firstDataDate(null, [])).toBeNull()
  })
})

describe('the Calendar remembers where it was', () => {
  it('starts on today, then keeps the last month and day shown', () => {
    expect(rememberedCalendar('2026-10-18')).toEqual({ month: OCT_2026, selected: '2026-10-18' })
    rememberCalendar({ year: 2026, month: 8 }, '2026-09-14')
    expect(rememberedCalendar('2026-10-18')).toEqual({ month: { year: 2026, month: 8 }, selected: '2026-09-14' })
  })
})
