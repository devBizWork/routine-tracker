import type { CategoryId } from './types'

/** The six task categories. Each one's fill color is the --color-cat-<id> token. */
export const CATEGORIES: readonly { id: CategoryId; name: string }[] = [
  { id: 'movement', name: 'Movement' },
  { id: 'focus', name: 'Focus' },
  { id: 'admin', name: 'Admin' },
  { id: 'meetings', name: 'Meetings' },
  { id: 'planning', name: 'Planning' },
  { id: 'personal', name: 'Personal' },
]

export const DEFAULT_CATEGORY: CategoryId = 'focus'

/** The CSS color of a category, for style={{ background: ... }}. */
export function categoryColor(id: CategoryId): string {
  return `var(--color-cat-${id})`
}

export function isCategoryId(value: unknown): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value)
}
