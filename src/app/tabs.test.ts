import { describe, expect, it } from 'vitest'
import { TABS } from './tabs'

describe('tab bar', () => {
  it('has the four tabs from the design, in order', () => {
    expect(TABS.map((t) => t.label)).toEqual(['Today', 'Calendar', 'Tasks', 'Settings'])
  })

  it('opens the routes listed in CLAUDE.md', () => {
    expect(TABS.map((t) => t.to)).toEqual(['/', '/calendar', '/tasks', '/settings'])
  })

  it('uses a different id and route for every tab', () => {
    expect(new Set(TABS.map((t) => t.id)).size).toBe(TABS.length)
    expect(new Set(TABS.map((t) => t.to)).size).toBe(TABS.length)
  })
})
