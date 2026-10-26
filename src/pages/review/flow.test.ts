import { describe, expect, it } from 'vitest'
import type { Occurrence } from '../../data'
import {
  absenceLabel,
  answerLabel,
  answerPatch,
  blocksToReview,
  logSnapshot,
  needsLog,
  cardList,
  keepRecentAbsences,
  mergeAbsence,
  missedBlocks,
  oldestAwayDay,
  otherTimesProblem,
  plannedSpan,
} from './flow'

const DATE = '2026-10-06'
const at = (h: number, m = 0, day = 6) => new Date(2026, 9, day, h, m).getTime()
const hm = (h: number, m = 0) => h * 60 + m

let counter = 0
function block(title: string, start: string, minutes: number, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: `o${++counter}`,
    taskId: `t${counter}`,
    date: DATE,
    title,
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

describe('which blocks Review today goes through', () => {
  const day = [
    block('Deep work', '09:00', 90), // over at 10:30
    block('Morning workout', '06:30', 60, { status: 'done', actualStart: '06:30', actualEnd: '07:30' }),
    block('Plan the day', '07:45', 30), // over at 8:15
    block('Lunch walk', '12:00', 30, { status: 'skipped' }),
    block('Client call', '10:30', 30, { timerStartedAt: 1 }), // timer running
    block('Project work', '13:00', 90), // later
  ]

  it('the unlogged blocks that are over, in time order', () => {
    expect(blocksToReview(day, DATE, DATE, hm(12, 10)).map((o) => o.title)).toEqual(['Plan the day', 'Deep work'])
  })

  it('a block still going on today is not left to log yet', () => {
    expect(blocksToReview(day, DATE, DATE, hm(10)).map((o) => o.title)).toEqual(['Plan the day'])
  })

  it('a past day: every unlogged block; a future day: none', () => {
    expect(blocksToReview(day, DATE, '2026-10-07', 0).map((o) => o.title)).toEqual([
      'Plan the day',
      'Deep work',
      'Project work',
    ])
    expect(blocksToReview(day, DATE, '2026-10-05', hm(23))).toEqual([])
  })

  it('logged, skipped and timed blocks are left out', () => {
    expect(needsLog(day[1] as Occurrence)).toBe(false)
    expect(needsLog(day[3] as Occurrence)).toBe(false)
    expect(needsLog(day[4] as Occurrence)).toBe(false)
    expect(needsLog(day[0] as Occurrence)).toBe(true)
  })

  it('a block with only a note still needs a log', () => {
    expect(needsLog(block('A', '09:00', 30, { note: 'hm' }))).toBe(true)
  })
})

describe('what each answer saves', () => {
  const o = block('Client check-in call', '10:30', 30, { note: 'kept' })

  it('Done as planned copies the planned times', () => {
    expect(answerPatch(o, { kind: 'planned' })).toMatchObject({ status: 'done', actualStart: '10:30', actualEnd: '11:00', note: 'kept' })
  })

  it('Done, at other times saves the times given', () => {
    expect(answerPatch(o, { kind: 'other', start: '10:45', end: '11:20' })).toMatchObject({
      status: 'done',
      actualStart: '10:45',
      actualEnd: '11:20',
    })
  })

  it('Skipped saves skipped', () => {
    expect(answerPatch(o, { kind: 'skipped' })).toMatchObject({ status: 'skipped', actualStart: null, actualEnd: null })
  })

  it('Not sure changes nothing (the block stays Unknown)', () => {
    expect(answerPatch(o, { kind: 'unsure' })).toBeNull()
  })

  it('Undo can put the log back exactly as it was', () => {
    const logged = block('A', '09:00', 30, { status: 'done', actualStart: '09:05', actualEnd: '09:30', note: 'n' })
    expect(logSnapshot(logged)).toEqual({ status: 'done', actualStart: '09:05', actualEnd: '09:30', timerStartedAt: null, note: 'n' })
  })
})

describe('the status line after an answer', () => {
  it('says what was saved', () => {
    expect(answerLabel({ kind: 'planned' }, '12h')).toBe('done as planned')
    expect(answerLabel({ kind: 'other', start: '09:15', end: '09:50' }, '12h')).toBe('done 9:15 – 9:50 am')
    expect(answerLabel({ kind: 'skipped' }, '12h')).toBe('skipped')
    expect(answerLabel({ kind: 'unsure' }, '12h')).toBe('left as Unknown')
  })
})

describe('Done, at other times', () => {
  it('needs both times, with Ended after Started', () => {
    expect(otherTimesProblem('', '10:00')).toBe('Choose when it started and ended.')
    expect(otherTimesProblem('10:00', '09:00')).toBe('Ended must be after Started.')
    expect(otherTimesProblem('10:00', '10:00')).toBe('Ended must be after Started.')
    expect(otherTimesProblem('09:00', '10:00')).toBeNull()
  })

  it('the card writes the planned span like the design', () => {
    expect(plannedSpan(block('A', '10:30', 30), '12h')).toBe('10:30 – 11:00 am')
  })
})

describe('While you were away', () => {
  // design/screens/WelcomeBack.html: away 10:20 am to 12:10 pm on Oct 6.
  const day = [
    block('Deep work', '09:00', 90, { status: 'done', actualStart: '09:00', actualEnd: '10:30' }), // done: not listed
    block('Client check-in call', '10:30', 30), // missed
    block('Admin & invoices', '11:15', 45), // missed
    block('Lunch walk', '12:00', 30), // still going on at 12:10: not listed yet
    block('Project work', '13:00', 90), // later
    block('Morning workout', '06:30', 60), // before the absence
  ]
  const away = [{ from: at(10, 20), to: at(12, 10) }]

  it('lists only blocks that passed while away, are over, and are not logged', () => {
    expect(missedBlocks(day, away, DATE, at(12, 10)).map((o) => o.title)).toEqual(['Client check-in call', 'Admin & invoices'])
  })

  it('a block logged anywhere drops off the card by itself', () => {
    const logged = day.map((o) => (o.title === 'Admin & invoices' ? { ...o, status: 'skipped' as const } : o))
    expect(missedBlocks(logged, away, DATE, at(12, 10)).map((o) => o.title)).toEqual(['Client check-in call'])
  })

  it('a block going on when you came back joins the list once it is over', () => {
    expect(missedBlocks(day, away, DATE, at(12, 40)).map((o) => o.title)).toContain('Lunch walk')
  })

  it('reaches back over several days, oldest first, but not more than a week', () => {
    const oct2 = { ...block('Old routine', '09:00', 30), date: '2026-10-02' }
    const sep29 = { ...block('Too old', '09:00', 30), date: '2026-09-29' }
    const longAway = [{ from: new Date(2026, 8, 28).getTime(), to: at(12, 10) }]
    const list = missedBlocks([...day, oct2, sep29], longAway, DATE, at(12, 10))
    expect(list[0]?.title).toBe('Old routine')
    expect(list.map((o) => o.title)).not.toContain('Too old')
    expect(oldestAwayDay(DATE)).toBe('2026-09-30')
  })

  it('shows at most 10, the most recent, and counts the rest', () => {
    const many = Array.from({ length: 13 }, (_, n) => block(`Block ${n + 1}`, `${String(n + 6).padStart(2, '0')}:00`, 30))
    const { shown, more } = cardList(many)
    expect(shown).toHaveLength(10)
    expect(more).toBe(3)
    expect(shown[0]?.title).toBe('Block 4')
    expect(shown[9]?.title).toBe('Block 13')
  })

  it('joins absences that overlap and keeps separate ones apart', () => {
    expect(mergeAbsence([], away[0]!)).toEqual(away)
    expect(mergeAbsence(away, { from: at(12), to: at(14) })).toEqual([{ from: at(10, 20), to: at(14) }])
    expect(mergeAbsence(away, { from: at(15), to: at(16) })).toHaveLength(2)
  })

  it('forgets absences that are more than a week old', () => {
    const old = { from: new Date(2026, 8, 20).getTime(), to: new Date(2026, 8, 21).getTime() }
    expect(keepRecentAbsences([old, ...away], at(12, 10))).toEqual(away)
  })

  it('writes the span of the absences', () => {
    expect(absenceLabel(away, '12h')).toBe('10:20 am – 12:10 pm')
    expect(absenceLabel([{ from: at(21, 40, 5), to: at(7, 5) }], '12h')).toBe('Mon 9:40 pm – 7:05 am')
  })
})
