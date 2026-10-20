import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { forgetCalendar, isCalendarPath } from '../pages/calendar/month'
import { StillDoingPrompt } from './StillDoingPrompt'
import { useAwayTracker } from './away'
import { TabBar } from './TabBar'

// Full-height column: the current screen scrolls on its own, the tab bar stays put.
// h-dvh (100dvh) follows the visible height on iPhone as Safari's toolbars come and go.
export function AppShell() {
  // Notes when the app was last in front, so Today can say what passed while it was away.
  useAwayTracker()

  // Going to another tab means the Calendar opens on today next time.
  const { pathname } = useLocation()
  useEffect(() => {
    if (!isCalendarPath(pathname)) forgetCalendar()
  }, [pathname])
  return (
    <div className="flex h-dvh flex-col bg-ground text-ink">
      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
      >
        <Outlet />
      </main>
      <TabBar />
      <StillDoingPrompt />
    </div>
  )
}
