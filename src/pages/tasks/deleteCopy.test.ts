import { describe, expect, it } from 'vitest'
import type { Task } from '../../data'
import { deleteCopy } from './deleteCopy'

const TODAY = '2026-10-06'

function task(extra: Partial<Task>): Task {
  return {
    id: 't',
    title: 'Morning workout',
    color: 'movement',
    startTime: '06:30',
    plannedMinutes: 60,
    repeat: { kind: 'daily', days: [] },
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

describe('deleteCopy', () => {
  it('a routine is deleted from today on, with the real date, and past days stay', () => {
    const copy = deleteCopy(task({}), 0, TODAY)
    expect(copy.title).toBe('Delete “Morning workout”?')
    expect(copy.confirm).toBe('Delete from today on')
    expect(copy.message).toContain('from today (Tue, Oct 6) on')
    expect(copy.message).toContain('Past days stay')
    expect(copy.message).not.toContain('logged')
  })

  it('a routine with logs says they stay in history', () => {
    expect(deleteCopy(task({}), 5, TODAY).message).toContain('Days you already logged stay in your history.')
  })

  it('a one-off is deleted as a block', () => {
    const once = task({ repeat: { kind: 'once', days: [] }, date: TODAY })
    expect(deleteCopy(once, 0, TODAY)).toMatchObject({ confirm: 'Delete block', message: 'This block will be removed from your plan.' })
  })

  it('a one-off with a log says the log stays in history', () => {
    const once = task({ repeat: { kind: 'once', days: [] }, date: TODAY })
    expect(deleteCopy(once, 1, TODAY).message).toBe('This block has a log. The log stays in your history.')
  })

  it('an inbox to-do is just removed', () => {
    const todo = task({ title: 'Call the dentist', startTime: null, repeat: { kind: 'once', days: [] } })
    expect(deleteCopy(todo, 0, TODAY)).toMatchObject({ title: 'Delete “Call the dentist”?', confirm: 'Delete to-do' })
  })
})
