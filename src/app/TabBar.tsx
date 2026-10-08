import { NavLink } from 'react-router'
import { TabIcon } from './TabIcon'
import { TABS } from './tabs'

// Layout copied from the <nav> in design/screens/Main.html. The bottom padding grows
// with the iPhone home indicator (safe area) so the labels never sit underneath it.
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="grid shrink-0 grid-cols-4 gap-1 border-t border-line bg-card px-3 pt-1.5"
      style={{
        paddingBottom: 'max(var(--safe-bottom), 12px)',
        paddingLeft: 'max(0.75rem, var(--safe-left))',
        paddingRight: 'max(0.75rem, var(--safe-right))',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex min-h-11 flex-col items-center justify-center gap-[3px] text-11 ${
              isActive ? 'font-bold text-primary' : 'font-semibold text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-7 w-13 items-center justify-center rounded-14 ${
                  isActive ? 'bg-pill' : ''
                }`}
              >
                <TabIcon id={tab.id} active={isActive} />
              </span>
              {tab.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
