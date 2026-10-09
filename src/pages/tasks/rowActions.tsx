import type { SwipeAction } from './SwipeRow'

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** The two buttons behind every row. */
export function rowActions(onDuplicate: () => void, onDelete: () => void): SwipeAction[] {
  return [
    {
      label: 'Duplicate',
      tone: 'normal',
      onSelect: onDuplicate,
      icon: (
        <svg {...iconProps}>
          <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
          <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
        </svg>
      ),
    },
    {
      label: 'Delete',
      tone: 'danger',
      onSelect: onDelete,
      icon: (
        <svg {...iconProps}>
          <path d="M4 7h16M10 11v6M14 11v6" />
          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
          <path d="M9 7V4.5h6V7" />
        </svg>
      ),
    },
  ]
}
