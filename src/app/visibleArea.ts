// On iPhone the on-screen keyboard does not shrink the page; it covers the bottom and Safari
// then slides the whole page up to keep the typing field in view. A sheet pinned to the
// full screen would be pushed up with it, and its top (Cancel, title, Save) would go off
// screen. The browser's visualViewport says which part of the screen is really visible, so
// the sheet's frame follows that part instead.

export interface VisibleArea {
  /** Distance from the top of the page to the top of the visible area, in pixels. */
  top: number
  /** Height of the visible area (the screen minus the keyboard), in pixels. */
  height: number
}

/** The visible area, from the browser's visual viewport. */
export function visibleArea(viewport: { offsetTop: number; height: number }): VisibleArea {
  return {
    top: Math.max(0, Math.round(viewport.offsetTop)),
    height: Math.max(0, Math.round(viewport.height)),
  }
}

/** If a field inside the frame is focused, make sure it is not left behind the keyboard. */
function keepFocusedFieldInView(frame: HTMLElement) {
  const focused = document.activeElement
  if (focused instanceof HTMLElement && frame.contains(focused) && focused.matches('input,textarea,select')) {
    focused.scrollIntoView({ block: 'nearest' })
  }
}

/**
 * Keeps a fixed, full-screen frame exactly over the visible part of the screen: it shrinks
 * above the keyboard and follows the page if the browser scrolls it. Returns a function that
 * stops following and puts the frame back. In browsers without visualViewport it does
 * nothing (the frame then simply covers the screen).
 */
export function followVisibleArea(frame: HTMLElement): () => void {
  const viewport = window.visualViewport
  if (!viewport) return () => {}

  let pending = 0
  const apply = () => {
    pending = 0
    const area = visibleArea(viewport)
    frame.style.top = `${area.top}px`
    frame.style.height = `${area.height}px`
    frame.style.bottom = 'auto'
  }
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(apply)
  }
  const onResize = () => {
    apply()
    keepFocusedFieldInView(frame)
  }

  apply()
  viewport.addEventListener('resize', onResize)
  viewport.addEventListener('scroll', schedule)
  return () => {
    if (pending) cancelAnimationFrame(pending)
    viewport.removeEventListener('resize', onResize)
    viewport.removeEventListener('scroll', schedule)
    frame.style.top = ''
    frame.style.height = ''
    frame.style.bottom = ''
  }
}
