import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { followVisibleArea } from './visibleArea'

// A sheet that slides up over the current screen (design/screens/AddTask.html).
// It is shown for as long as it is rendered; to close it, set `closing` and it slides
// away, then calls onClosed so the owner can stop rendering it.
//
//   Backdrop tap, swipe down and Escape all call onRequestClose. The owner decides what
//   that means (for example "ask before discarding") and sets `closing` when it is fine.

const CLOSE_MS = 240
const SWIPE_DISTANCE = 110 // pixels dragged down that count as "close"
const SWIPE_SPEED = 0.7 // pixels per millisecond that count as a flick
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface Props {
  /** id of the heading that names the sheet */
  labelledBy: string
  onRequestClose: () => void
  closing: boolean
  onClosed: () => void
  /** Cancel / title / Save row. Dragging it (or the handle above it) swipes the sheet. */
  header: ReactNode
  children: ReactNode
  /** Shown over the sheet, for example a "Discard?" question. */
  overlay?: ReactNode
  /** While true the sheet itself cannot be reached (an overlay question is open). */
  blocked?: boolean
}

export function BottomSheet({
  labelledBy,
  onRequestClose,
  closing,
  onClosed,
  header,
  children,
  overlay,
  blocked = false,
}: Props) {
  const sheetRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(closing)
  const onClosedRef = useRef(onClosed)
  const onRequestCloseRef = useRef(onRequestClose)
  const stopDrag = useRef<(() => void) | null>(null)

  useEffect(() => {
    closingRef.current = closing
    onClosedRef.current = onClosed
    onRequestCloseRef.current = onRequestClose
  })

  // If the sheet goes away mid-swipe, stop listening.
  useEffect(() => () => stopDrag.current?.(), [])

  // Stay inside the visible part of the screen when the phone's keyboard opens.
  useEffect(() => {
    const frame = frameRef.current
    return frame ? followVisibleArea(frame) : undefined
  }, [])

  // Closing: drop any leftover swipe offset so the slide-away continues from where it is.
  useEffect(() => {
    if (!closing) return
    if (sheetRef.current) sheetRef.current.style.transform = ''
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => onClosedRef.current(), reduced ? 0 : CLOSE_MS)
    return () => clearTimeout(timer)
  }, [closing])

  // While open: the screen behind cannot be tapped or tabbed into, and focus goes back
  // to whatever opened the sheet when it closes.
  // Noted while rendering, before the sheet's own autofocus field takes the focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => {
      mounted.current = false
      root?.removeAttribute('inert')
      // Only after a real close (React's development double-run mounts again at once).
      setTimeout(() => {
        if (!mounted.current) opener?.focus?.()
      }, 0)
    }
  }, [opener])

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onRequestClose()
      return
    }
    if (event.key !== 'Tab' || !frameRef.current) return
    const items = [...frameRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.closest('[inert]'),
    )
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // ---- swipe down on the handle / header ----
  // Listens on the window while a finger (or mouse) is down, so a fast flick that leaves the
  // header is still followed.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current
    if (!sheet || (event.target as HTMLElement).closest('button,a,input,select,textarea')) return
    stopDrag.current?.()

    const startY = event.clientY
    let lastY = startY
    let lastT = event.timeStamp
    let speed = 0
    let active = false

    const move = (e: PointerEvent) => {
      const dy = e.clientY - startY
      if (!active && dy > 6) {
        active = true
        sheet.style.transition = 'none'
      }
      if (!active) return
      speed = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT)
      lastY = e.clientY
      lastT = e.timeStamp
      sheet.style.transform = `translateY(${Math.max(0, dy)}px)`
    }

    const finish = (e: PointerEvent, cancelled: boolean) => {
      stop()
      if (!active) return
      sheet.style.transition = ''
      if (!cancelled && (e.clientY - startY > SWIPE_DISTANCE || speed > SWIPE_SPEED)) {
        onRequestCloseRef.current()
      }
      // If nothing closed the sheet (it asked "discard?"), slide it back into place.
      requestAnimationFrame(() => {
        if (!closingRef.current) sheet.style.transform = ''
      })
    }
    const up = (e: PointerEvent) => finish(e, false)
    const cancel = (e: PointerEvent) => finish(e, true)
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      stopDrag.current = null
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    stopDrag.current = stop
  }

  return createPortal(
    <div ref={frameRef} className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <div
        aria-hidden="true"
        data-closing={closing}
        className="scrim absolute inset-0 touch-none bg-scrim"
        onClick={onRequestClose}
      />
      <div
        aria-hidden="true"
        data-closing={closing}
        className="scrim absolute rounded-t-22 bg-sheet-peek"
        style={{ left: 14, right: 14, top: 'calc(var(--safe-top) + 14px)', height: 40 }}
      />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-closing={closing}
        inert={blocked}
        className="sheet absolute inset-x-0 bottom-0 flex flex-col rounded-t-28 bg-ground"
        style={{ top: 'calc(var(--safe-top) + 28px)' }}
      >
        <div
          className="touch-none select-none"
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={onPointerDown}
        >
          <div aria-hidden="true" className="mx-auto mt-2 mb-1 h-[5px] w-9 rounded-3 bg-line-strong" />
          {header}
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
        >
          {children}
        </div>
      </section>
      {overlay}
    </div>,
    document.body,
  )
}
