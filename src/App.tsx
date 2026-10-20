import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { CalendarPage } from './pages/CalendarPage'
import { DayPage } from './pages/DayPage'
import { DayReviewPage } from './pages/DayReviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'
import { TrendsPage } from './pages/TrendsPage'

// HashRouter keeps the route after a "#" (for example #/calendar), so every screen
// works on GitHub Pages, which has no server rules for deep links.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="day/:date" element={<DayPage />} />
          <Route path="day/:date/review" element={<DayReviewPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
