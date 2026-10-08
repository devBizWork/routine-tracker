import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { occursOn } from './repeat'
import { buildSampleData, SAMPLE_PAST_DAYS } from './sample'
import { setup } from './test-utils'
import { minutesToTime, timeToMinutes } from './time'
import type { Occurrence } from './types'

const TODAY = '2026-10-08'
const NOW = new Date(2026, 9, 8, 9, 0).getTime()

function kindOf(o: Occurrence): 'onPlan' | 'offPlan' | 'skipped' | 'unlogged' {
  if (o.status === 'skipped') return 'skipped'
  if (o.status === 'planned') return 'unlogged'
  const plannedEnd = minutesToTime(timeToMinutes(o.plannedStart) + o.plannedMinutes)
  return o.actualStart === o.plannedStart && o.actualEnd === plannedEnd ? 'onPlan' : 'offPlan'
}

describe('sample data', () => {
  const sample = buildSampleData(TODAY, NOW)

  it('has the 14 tasks from the Tasks screen', () => {
    expect(sample.tasks).toHaveLength(14)
    expect(sample.tasks.filter((t) => t.startTime === null)).toHaveLength(3) // inbox
    expect(sample.tasks.filter((t) => t.startTime !== null && t.repeat.kind !== 'once')).toHaveLength(8)
    expect(sample.tasks.filter((t) => t.startTime !== null && t.repeat.kind === 'once')).toHaveLength(3)
    expect(sample.tasks.map((t) => t.title)).toContain('Morning workout')
  })

  it('covers the past 7 days, and only the past', () => {
    expect(sample.days.map((d) => d.date)).toEqual(
      Array.from({ length: SAMPLE_PAST_DAYS }, (_, i) => addDays(TODAY, i - SAMPLE_PAST_DAYS)),
    )
    for (const o of sample.occurrences) expect(o.date < TODAY).toBe(true)
  })

  it('logs blocks that are done as planned, off plan, skipped and unlogged', () => {
    const kinds = new Set(sample.occurrences.map(kindOf))
    expect(kinds).toEqual(new Set(['onPlan', 'offPlan', 'skipped', 'unlogged']))
  })

  it('gives every logged block times that make sense', () => {
    for (const o of sample.occurrences) {
      if (o.status === 'done') {
        expect(timeToMinutes(o.actualEnd!)).toBeGreaterThan(timeToMinutes(o.actualStart!))
      } else {
        expect(o.actualStart).toBeNull()
      }
    }
  })

  it('has a block for each task that applies on each past day, and no others', () => {
    for (const day of sample.days) {
      const expected = sample.tasks.filter((t) => occursOn(t, day.date)).map((t) => t.id).sort()
      const actual = sample.occurrences.filter((o) => o.date === day.date).map((o) => o.taskId).sort()
      expect(actual).toEqual(expected)
    }
  })
})

describe('developer tools on the real database code', () => {
  it('loads the sample, which then reads back as it was built', async () => {
    const { api } = setup()
    await api.loadSampleData()
    const counts = await api.counts()
    expect(counts.tasks).toBe(14)
    expect(counts.days).toBe(SAMPLE_PAST_DAYS)
    expect(counts.occurrences).toBeGreaterThan(30)

    // Opening a past day shows the logs and creates nothing new.
    const yesterday = await api.getDay('2026-10-07')
    expect(yesterday.length).toBeGreaterThan(0)
    expect((await api.counts()).occurrences).toBe(counts.occurrences)
  })

  it("today's page has the two one-off blocks and no inbox tasks", async () => {
    const { api } = setup()
    await api.loadSampleData()
    const titles = (await api.getDay(TODAY)).map((o) => o.title)
    expect(titles).toContain('Client check-in call')
    expect(titles).toContain('Admin & invoices')
    expect(titles).not.toContain('Call the dentist')
    expect(titles).toContain('Deep work') // a weekday routine; today is a Thursday
    expect((await api.getDay('2026-10-10')).map((o) => o.title)).not.toContain('Deep work') // Saturday
  })

  it('loading again replaces instead of piling up, and leaves settings alone', async () => {
    const { api } = setup()
    await api.updateSettings({ timeFormat: '24h' })
    await api.loadSampleData()
    await api.loadSampleData()
    expect((await api.counts()).tasks).toBe(14)
    expect((await api.getSettings()).timeFormat).toBe('24h')
  })

  it('erase removes everything and puts the default settings back', async () => {
    const { api } = setup()
    await api.updateSettings({ timeFormat: '24h' })
    await api.loadSampleData()
    await api.eraseAllData()
    expect(await api.counts()).toEqual({ tasks: 0, occurrences: 0, days: 0 })
    expect((await api.getSettings()).timeFormat).toBe('12h')
  })

  it('erase keeps the per-device notes (such as the Developer switch)', async () => {
    const { api } = setup()
    await api.setMeta('developerVisible', true)
    await api.eraseAllData()
    expect(await api.getMeta('developerVisible')).toBe(true)
  })
})
