import { PageHeader } from '../app/PageHeader'
import { APP_VERSION } from '../app/version'

export function SettingsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Settings" />
      {/* Pushed to the bottom of the screen. Tapping it 5 times will unlock the
          Developer section in a later step. */}
      <p className="mt-auto px-5 py-6 text-center text-12 font-semibold text-muted">
        Version {APP_VERSION}
      </p>
    </div>
  )
}
