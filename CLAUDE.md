# Routine Tracker: project context

You are building Routine Tracker, an iPhone-first Progressive Web App for time-blocking a day:
block out the day, follow the blocks, log what happened, review two adherence scores.
Read docs/feature-spec.md before any work. The screens in design/screens/*.html are the
source of truth for layout, copy, spacing, colors and states. Match them closely.

## How we work
- Build ONLY the step I give you. Do not start later features, even if a screen shows them.
  Anything visible but not yet built shows a small "Coming soon" note. No dead taps.
- Before coding, list the files you will create or change and the checks you will run.
- After coding, run: type check, lint, unit tests, production build. Fix failures first.
- Work on a branch named step-N (never commit straight to main). Finish every step by
  committing, pushing the branch and opening a pull request with `gh pr create` whose
  description says what changed and how to test it. I click Merge on GitHub myself; merging
  deploys the live site. Do not merge for me unless I say so. After I merge, give me the
  commands to update main and tag it (git checkout main, git pull, git tag step-N, then
  `git push origin tag step-N`; the word `tag` is needed because the branch and the tag
  share a name). Tell me clearly that the tag must wait until after I have merged.
- Finish every step with: what changed, how to test it on my iPhone in plain numbered steps
  (the live site is the test site, so these steps are for after the merge deploys), and the
  pull request link.
- Update PROGRESS.md at the end of every step: steps done, known bugs, decisions made.
- I am not a professional developer. Explain in plain words and give me every command.
- Check current docs before using a library; versions change. Ask before adding any
  dependency not listed below, and before changing working features outside this step.

## Stack (do not swap without asking)
- Vite + React + TypeScript (strict mode), React Router
- Tailwind CSS with design tokens as CSS variables in src/styles/tokens.css
- Dexie (IndexedDB) for all data. No server, no accounts, no analytics, no runtime network calls.
- vite-plugin-pwa for the manifest and service worker; precache everything; offline-first
- date-fns for dates, Vitest for unit tests
- GitHub Pages, deployed by a GitHub Actions workflow on every push to main. The site
  lives at https://<username>.github.io/routine-tracker/, so Vite's base, the manifest
  (start_url, scope) and the service worker all use /routine-tracker/.
- There is no separate preview site: the live site is the test site. The Developer section
  in Settings stays hidden until "Version" is tapped 5 times.

## Design rules
- Designs in use: the 16 files in design/screens (layout, copy, spacing, states) and
  design/theme-option-z.html (colors and fonts). Ignore any other theme option.
- The screens were drawn in an older purple palette. Keep their layout and copy, but
  apply Option Z colors by role:
  purple #4B2E83 -> pool blue #0B6E99 (primary actions, Followed, actual bars, now line)
  #E2DBFB, #E9E4FD -> #D6F3F7 (active tab pill, selected states)
  page #F5F2FA -> ground #F2FAFC; ink #15111F -> #0E1A20; muted #5E5670 -> #4E6670
  borders #E6E0F0, #EFEBF6 -> #DFF0F4 (stronger borders #D3E9EF); cards stay #FFFFFF
  off-plan #F08A5D -> Missed #F28A3C; small orange text keeps #B4501C for contrast
  Unknown: stripes #DCEDF1 / #F8FCFD, dashed edge #8AA6AE
  Now card: fill #D9F4F8, border #B5E4EC, progress #0B6E99 on white
  Accents, used sparingly: aqua #2EC4D6, sunshine #FFD166
  Titles are always ink, never colored. Caption text naming other colors is out of date.
- Fonts: Bricolage Grotesque (headings), Nunito Sans (body; replaces Plus Jakarta Sans in
  the screens). Self-host both so they work offline. Tabular numbers for times and scores.
- Task categories (name + color): Movement #E4F5CF, Focus #D8E8FB, Admin #FFF0C2,
  Meetings #FFDFD6, Planning #D2F3F6, Personal #FBE2EE. Default Focus. Text on them is ink.
- Every color lives in tokens.css. Body text contrast at least 4.5:1.
- iPhone first: design width 390px, must also fit 375px. Respect safe areas
  (viewport-fit=cover, env(safe-area-inset-*)). Use 100dvh, never 100vh.
- Tap targets at least 44px. Input text at least 16px so iOS does not zoom.
- Real <button>, <a>, <input>, <label>. aria-label on every icon-only button.
- Bottom sheets (Add/Edit task, Log time, Review today, Restore, pickers) slide up and close
  with Cancel or X, a swipe down, or a tap on the backdrop. Ask before discarding typed changes.
- Time fields use the native iOS picker (<input type="time">) styled like the designs.
- Light theme only in v1. Portrait only.

## Data model
- Task: id, title, color, startTime "HH:mm" (null while in the inbox), plannedMinutes,
  repeat {kind: once | daily | weekdays | custom, days: 0-6[]}, date (for once),
  activeFrom, activeTo, soundOverride (null = app default | chimeId | "silent"), notes,
  createdAt, updatedAt.
- Occurrence (one task on one date): id, taskId, date "YYYY-MM-DD", title, color,
  plannedStart, plannedMinutes (copied from the task), status (planned | done | skipped),
  actualStart, actualEnd, timerStartedAt, note.
- Settings: soundsOn, chimeId, warn5min, endSound, quietHours {on, from, to}, keepScreenOn,
  dayStart, dayEnd, timeFormat (12h | 24h), tolerances {onTimeMin: 10, lengthPct: 10,
  zeroCreditMin: 60}, lastBackupAt, backupReminderDays (7), installPromptDismissed.
- All plan times are local wall-clock strings, never UTC. A 7:00 am block stays 7:00 am.
- Occurrences for a date are created the first time that date is needed, from the tasks
  active that day, then stored. Editing "this and future days" never changes past dates.
- A running timer is a saved start timestamp, never a counter, so it survives closing the app.

## Routes
HashRouter (links look like #/calendar), so every screen works on GitHub Pages with no
server rewrites: #/ Today, #/calendar, #/day/:date, #/day/:date/review, #/trends,
#/tasks, #/settings. Sheets open over the current screen.

## Definition of done (every step)
- Works in iPhone Safari AND as the Home Screen app, in airplane mode.
- No console errors. Type check, lint, tests and build all pass.
- Every button on the screens touched in this step works or shows "Coming soon".
- PROGRESS.md updated.
