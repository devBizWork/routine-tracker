import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

// A list row you can swipe left to reveal buttons behind it (Duplicate and Delete), as in
// design/screens/Tasks.html. The page keeps track of which row is open, so only one is open at
// a time and a tap anywhere else closes it. Keyboard: Left arrow opens, Right arrow or Escape closes.

const ACTION_WIDTH = 80
const START_DRAG = 8 // pixels of sideways movement before it counts as a swipe

export interface SwipeAction {
  label: string
  icon: ReactNode
  tone: 'normal' | 'danger'
  onSelect: () => void
}

export function SwipeRow({
  open,
  onOpenChange,
  actions,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: SwipeAction[]
  children: ReactNode
}) {
  const total = ACTION_WIDTH * actions.length
  const [dragX, setDragX] = useState<number | null>(null)
  const gesture = useRef<{ x: number; y: number; dragging: boolean } | null>(null)
  const swiped = useRef(false) // a swipe just ended, so the tap that follows it must be ignored

  const offset = (dx: number) => Math.min(0, Math.max(-total, (open ? -total : 0) + dx))

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    gesture.current = { x: event.clientX, y: event.clientY, dragging: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g) return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (!g.dragging) {
      if (Math.abs(dy) > START_DRAG && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null // the page is scrolling up or down, not a swipe
        return
      }
      if (Math.abs(dx) <= START_DRAG) return
      g.dragging = true
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Not every pointer can be captured; the swipe still follows while it stays on the row.
      }
    }
    setDragX(offset(dx))
  }

  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current
    gesture.current = null
    if (!g?.dragging) return
    swiped.current = true
    setTimeout(() => (swiped.current = false), 0)
    const end = offset(event.clientX - g.x)
    setDragX(null)
    if (!cancelled) onOpenChange(end < -total / 2)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onOpenChange(true)
    } else if (open && (event.key === 'ArrowRight' || event.key === 'Escape')) {
      event.preventDefault()
      event.stopPropagation()
      onOpenChange(false)
    }
  }

  // A tap on the row itself: right after a swipe it is ignored; while the row is open it
  // only closes the row instead of doing what the row normally does.
  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (swiped.current) {
      event.preventDefault()
      event.stopPropagation()
    } else if (open) {
      event.preventDefault()
      event.stopPropagation()
      onOpenChange(false)
    }
  }

  const shown = dragX ?? (open ? -total : 0)
  // The buttons are only visible while the row is open or being dragged (and for the moment it
  // takes to slide shut). Otherwise a row whose height ends on a fraction of a pixel can show a
  // hair of the red Delete button along its bottom edge, under the arrow.
  const revealed = open || dragX !== null

  return (
    <div data-swipe-row data-open={open} className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex"
        inert={!open}
        style={{
          visibility: revealed ? 'visible' : 'hidden',
          transition: revealed ? 'none' : 'visibility 0s linear 200ms',
        }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              onOpenChange(false)
              action.onSelect()
            }}
            style={{ width: ACTION_WIDTH }}
            className={`flex flex-col items-center justify-center gap-1 border-0 p-0 text-12 font-bold ${
              action.tone === 'danger' ? 'bg-missed-text text-on-primary' : 'bg-pill text-ink'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="relative touch-pan-y bg-card"
        style={{
          transform: `translateX(${shown}px)`,
          transition: dragX === null ? 'transform 200ms ease' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onKeyDown={onKeyDown}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}
