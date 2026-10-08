export type TabId = 'today' | 'calendar' | 'tasks' | 'settings'

export interface Tab {
  id: TabId
  label: string
  /** Route path under the HashRouter, so the address looks like #/calendar */
  to: string
}

export const TABS: readonly Tab[] = [
  { id: 'today', label: 'Today', to: '/' },
  { id: 'calendar', label: 'Calendar', to: '/calendar' },
  { id: 'tasks', label: 'Tasks', to: '/tasks' },
  { id: 'settings', label: 'Settings', to: '/settings' },
]
