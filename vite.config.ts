import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { BASE_PATH, manifest } from './config/app.config.ts'
import { injectContentSecurityPolicy } from './config/security.ts'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      // Builds only: locks the finished app so it cannot send data anywhere.
      name: 'routine-content-security-policy',
      apply: 'build',
      transformIndexHtml: { order: 'post', handler: injectContentSecurityPolicy },
    },
    VitePWA({
      // The app updates itself the next time it is opened online. Offline, the
      // previously cached copy keeps working.
      registerType: 'autoUpdate',
      manifest,
      workbox: {
        // Precache everything the app needs: code, styles, fonts, icons.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        // HashRouter always loads index.html, so offline start-up needs nothing else.
        navigateFallback: `${BASE_PATH}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'config/**/*.test.ts'],
  },
})
