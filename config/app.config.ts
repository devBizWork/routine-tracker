// Shared build settings. If you ever rename the GitHub repository, change REPO_NAME
// here and nowhere else: the Vite base, the manifest and the service worker follow it.
import type { ManifestOptions } from 'vite-plugin-pwa'

export const REPO_NAME = 'routine-tracker'
export const BASE_PATH = `/${REPO_NAME}/`

// Must match --color-ground in src/styles/tokens.css (a unit test checks this).
export const GROUND_COLOR = '#F2FAFC'

export const manifest: Partial<ManifestOptions> = {
  id: BASE_PATH,
  name: 'Routine Tracker',
  short_name: 'Routine',
  description: 'Block out your day, follow the blocks, log what happened.',
  lang: 'en',
  display: 'standalone',
  orientation: 'portrait',
  start_url: BASE_PATH,
  scope: BASE_PATH,
  theme_color: GROUND_COLOR,
  background_color: GROUND_COLOR,
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
