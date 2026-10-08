import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { initData } from './data'
import './styles/index.css'

// Starts the service worker, which saves the whole app on the phone so it opens offline.
registerSW({ immediate: true })

// Opens the on-device database, makes sure the settings exist, and asks the browser to
// keep our data safe. Screens read the data themselves, so the app does not wait for this.
initData().catch((error) => console.error('Could not start the database', error))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
