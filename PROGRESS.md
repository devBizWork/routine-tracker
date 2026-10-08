# Progress

## Steps done

- **Step 0:** computer set up (Git, Node, npm, GitHub CLI), Git repository created, first commit "Starter kit".
- **Step 1:** project setup, app shell and live link (this step). Tag: `step-1`.
  - Vite + React + TypeScript (strict) + Tailwind + React Router (HashRouter) + ESLint + Vitest.
  - `src/styles/tokens.css`: Option Z colors, every radius and font size from the screens,
    safe-area variables. Bricolage Grotesque and Nunito Sans are bundled in `src/assets/fonts`.
  - Bottom tab bar (Today, Calendar, Tasks, Settings) copied from `Main.html`; each tab shows
    only its title. Settings shows "Version 0.1.0" at the bottom.
  - PWA: manifest, placeholder icons, iOS meta tags, service worker that saves the whole app.
  - GitHub Pages: `base` is `/routine-tracker/`; `.github/workflows/deploy.yml` builds, checks
    and deploys on every push to `main`.
  - README "Deploy" section with the exact steps.

## Known bugs / not yet verified

- Not yet tried on a real iPhone, in the Home Screen app, or in airplane mode. Do the
  walkthrough from the Step 1 hand-off and note anything odd here.
- The app icons are placeholders (a clock drawn by `scripts/generate-icons.mjs`).
- No component tests yet: they need `jsdom` and `@testing-library/react`, which are not in the
  approved stack. Ask before adding them.

## Decisions made

- **TypeScript 6.0.x, not 7.** The ESLint TypeScript plugin does not support TypeScript 7 yet.
  Revisit when `typescript-eslint` allows it.
- **ESLint, not oxlint.** The current Vite template uses oxlint; ESLint 10 + `typescript-eslint`
  was used because it was asked for.
- **`react-router` (v8) is the router package.** `HashRouter`, `NavLink` etc. are imported from
  `react-router`, not `react-router-dom`.
- **Tailwind v4 reads the tokens directly.** `tokens.css` uses `@theme static`, so each token is
  both a CSS variable and a class (`bg-ground`, `text-13`, `rounded-14`). Radii and font sizes
  are named after their pixel size; a half pixel uses a dash (`text-12-5`). Tailwind's own
  default colors, radii and font sizes are switched off so only token values can be used.
  A unit test checks that every radius and font size in `design/screens` has a token.
- **Fonts were copied, not installed.** The files come from the Fontsource packages (open font
  license, kept next to the files) so no new dependency is needed. Latin and Latin Extended
  only; both are saved for offline use.
- **Status bar:** `apple-mobile-web-app-status-bar-style` is `default` (dark text on a light
  bar), which suits the light theme. The theme and background colors are the ground color.
- **Service worker updates itself** (`registerType: autoUpdate`). Revisit when screens with
  unsaved typing exist, so an update never interrupts an edit.
- **Repository name lives in one place:** `REPO_NAME` in `config/app.config.ts`.
- `.gitattributes` forces LF line endings (removes the Windows LF/CRLF warnings).
  `.gitignore` also ignores `dev-dist`, `*.local` and `.claude/`.
