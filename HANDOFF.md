# HANDOFF: Routine Tracker

## START HERE (new session, read this block first)

1. Read this file and `CLAUDE.md` only. Do NOT read everything up front: `PROGRESS.md` is long (read just the
   newest step and the "Known bugs" section), and design files are large (open only the screens the
   current step names).
2. Tell the user what you understood in 3 lines, then **wait for their "Step N of 16" prompt**.
3. Follow section 3 (workflow) exactly: branch `step-N`, `npm run check`, PR with a walkthrough, the user
   merges, then the tag commands (with the word `tag`).

**Keep a session small** (a step's work fills most of a session, so do one step per session):
- Filter command output (`npm run check 2>&1 | grep -E "error|FAIL|Tests |built in"`), never dump logs.
- Check screens with DOM measurements (`javascript_tool`), not screenshots (they are tiny and costly).
- Reuse the pieces in section 7b instead of re-reading source files; read a file only to edit it.
- When the session is about 70% full: update section 4 and 5 below and `PROGRESS.md`, commit them on a
  small branch (`handoff-update`), open a PR, and tell the user to start a fresh session.

Written at the end of Step 5 so a fresh session can carry on without the earlier conversation.
Read this first, then `CLAUDE.md` (the rules), `docs/feature-spec.md` (the product) and
`PROGRESS.md` (a detailed log of every step, bug and decision). Where they disagree, `CLAUDE.md`
and the user's latest message win.

## 1. The goal and what "finished" means

An **iPhone-first Progressive Web App for time-blocking a day**: block out the day, follow the
blocks, log what happened, review two adherence scores (Logged score and Day score). Everything
stays on the phone (no server, no accounts, no analytics, no runtime network calls). It is
installed from Safari to the Home Screen and must work **offline**.

Plan: **16 steps**, one prompt per step from the user ("Step N of 16: ..."). Steps 1 to 6 are done (plus fixes); Step 7 is built and waiting for the user's merge.
Build ONLY the step you are given. Anything shown in a design but not yet built shows a small
"Coming soon" note (no dead taps).

**Definition of done for every step** (from `CLAUDE.md`):
- Works in iPhone Safari AND as the Home Screen app, in airplane mode.
- No console errors. Type check, lint, tests and build all pass.
- Every button on the screens touched shows its feature or "Coming soon".
- `PROGRESS.md` updated (steps done, known bugs, decisions).

**Final target**: the 16 screens in `design/screens/*.html` (Today, Calendar, Day, Day review,
Review flow, Tasks, Add/Edit task, Log time, Trends, Settings, First run, Install walkthrough,
Welcome back, Muted + backup reminder, Restore, States) built to match their layout and copy, using
the Option Z colors and fonts (`design/theme-option-z.html`; the role mapping is in `CLAUDE.md`), with
data in IndexedDB, a service worker precaching everything, live on GitHub Pages at
`https://devbizwork.github.io/routine-tracker/`.

Spec features: (1) to-do list of tasks and routines, (2) calendar with day timeline, (3) logging actual
time, (4) two adherence scores with trends, (5) task-change sounds. Plus backup/restore via the Files
app, install walkthrough, quiet hours, 12/24-hour time, tolerances. Scoring formulas are in
`docs/feature-spec.md` ("Adherence scoring").

## 2. Who the user is and how they want to work

- **Not a professional developer.** Explain in plain words, give every command, lead with the answer,
  use analogies. Say clearly what was verified and what was NOT (never claim iPhone testing that
  was not done). The user tests on a real iPhone (Home Screen app) after each merge.
- Windows 11 Enterprise, GitHub account **devBizWork**, git identity "Em" with the GitHub no-reply email.
- Cares about privacy (see the network lock below).

## 3. Workflow rules (important, easy to get wrong)

1. **Before coding:** list the files you will create/change and the checks you will run.
2. **Branch per step**: `step-N` from an up-to-date `main`. Never commit to `main`. Fixes between steps
   use their own branch (examples: `step-3-fix`, `step-3-fix-duration-label`).
3. **After coding:** `npm run check` (type check, lint, tests, build). Fix failures first.
4. **Finish with** a commit (ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`),
   push, and `gh pr create` whose body says what changed, how it was checked, what is NOT yet checked
   on an iPhone, and numbered iPhone test steps. PR bodies end with
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. After creating a PR, call
   `mcp__ccd_pr__bind_pr` with its URL (the desktop app tracks it); do not poll CI yourself.
5. **The user clicks Merge on GitHub.** Never merge for them unless told to. Merging to `main` deploys
   the live site (`deploy.yml`), which is the only test site.
6. **After the merge** give the user these commands (the tag MUST wait until after the merge):
   ```bash
   git checkout main
   git pull
   git tag step-N
   git push origin tag step-N
   ```
   `git push origin step-N` fails ("matches more than one") because the branch and tag share a name,
   so always use `tag`. Use `git switch` (not `checkout`) to move to a branch.
7. **Leave the user's folder on `main`** at the end of a turn (`git switch main`). Consequence: their
   `npm run dev` shows the previous step until they merge, or run `git switch step-N` first.
8. Update `PROGRESS.md` at the end of every step. Ask before adding a dependency not in the stack,
   and before changing working features outside the current step.

## 4. State of the repository (checked at handoff)

`main` = `13acd4c` (Merge pull request #6, Step 5). Tags on GitHub: `step-1` (fecdf7f), `step-2` (397d30c),
`step-3` (fafaf65), `step-4` (1936298), `step-5` (on the Step 5 merge).

| PR | Branch | What | Status | CI |
| --- | --- | --- | --- | --- |
| #1 | setup-pr-workflow | PR workflow, CI on PRs, rules in CLAUDE.md | merged | green |
| #2 | step-3 | Tasks tab + New block sheet | merged | green |
| #3 | step-3-fix | keyboard pushed the New block sheet off screen (visualViewport fix) | merged | green |
| #4 | step-3-fix-duration-label | "Duration · ends 8:28 pm" wrapped onto two lines | merged | green |
| #5 | step-4 | edit, duplicate, delete, swipe, schedule Inbox | merged | green |
| #6 | step-5 | Today screen as a live timeline (+ this HANDOFF.md) | merged | green |

No open PRs and no unresolved review comments at the time of the last update.

Steps 1 and 2 were committed straight to `main` before the PR rule existed (commits `fecdf7f` Step 1,
`397d30c` Step 2, plus `56a225f` a Developer-panel fix). Old merged branches still exist locally and
on GitHub; they can be deleted.

### What each done step delivered (details in PROGRESS.md)

- **Step 1:** Vite + React + TypeScript (strict) + Tailwind v4 + HashRouter + ESLint + Vitest;
  `src/styles/tokens.css` (all colors, radii and font sizes named by pixel size); self-hosted
  Bricolage Grotesque and Nunito Sans; 4-tab bar; PWA (manifest, placeholder icons from
  `scripts/generate-icons.mjs`, service worker); GitHub Pages deploy workflow. Verified on the iPhone.
- **Step 2:** Dexie database (`tasks`, `occurrences`, `settings`, `days`, `meta`), data API in `src/data/`,
  repeat rules, persistent-storage request, hidden Developer section in Settings (tap "Version" 5 times:
  counts, day inspector, Load sample data, Erase). **Network lock:** the built page carries a Content
  Security Policy with `connect-src 'none'` (`config/security.ts`, build-only), so the app cannot send
  data anywhere. `.gitignore` blocks `routine-backup-*.json` and `routine-*.csv`.
- **Step 3:** Tasks screen (Inbox / Routines / One-off), Inbox quick add, New block sheet (title, native
  time pickers, duration 5 to 480 in 5-minute steps, End sync, repeat, category, notes, overlap warning,
  discard question), reusable `BottomSheet`. Fixes for the keyboard (`src/app/visibleArea.ts`) and a wrapping label.
- **Step 4:** Edit sheet with "Apply changes to" (This day only / This and future days), Duplicate,
  Delete action sheet, swipe-left rows, Inbox Schedule; Duplicate on an Inbox to-do adds another to-do.
- **Step 5 (PR #6):** Today header, timeline, now line, Now/Next card, empty states, foreground/midnight refresh.

## 5. Remaining work, in order

**Very next step:** the user merges and tests Step 7 on their iPhone and reports (see the test log in 7c). Fix
anything they report in its own small branch/PR first (like `step-5-fix`), then they send the next step's
prompt. Do not start any step the user has not sent.

The user supplies each step's prompt. Known from the conversation:
- **Step 6: logging: DONE (merged).** It was: (Start/Stop timer, "Done as planned", Skipped, manual times, notes; the Log time
  sheet in `LogTime.html`; actual bars, done/off-plan/skipped looks, "+15 min" tag and the running-timer chip
  from `States.html`/`Main.html`). Today's blocks and quick buttons currently say "Coming soon".
- **Step 7: scores** (Day score chip on Today, Day review, "Review day" button now Coming soon).
- **Step 11: sounds** (chimes, 5-minute warning, quiet hours, mute button now Coming soon).
- **Step 14** needs the final app icon: the user adds `design/icon.png` (1024 x 1024) before it
  (`design/README.md`). Current icons are placeholders.
- **Steps 8 to 10, 12, 13, 15 and 16 have not been described yet.** The screens not yet built are
  Calendar, Day, Day review, Review flow, Log time, Trends, the rest of Settings (sounds, hours, time
  format, tolerances, backup), Install walkthrough, Welcome back, Muted + backup reminder banner, Restore.
  Do not guess the order; wait for the user's prompt.

## 6. Decisions made, and approaches rejected (with reasons)

- **TypeScript 6.0.x, not 7**: `typescript-eslint` does not support 7 yet. **ESLint, not oxlint** (asked for).
- **`react-router` v8** package (not `react-router-dom`), `HashRouter`.
- **Fonts copied from Fontsource tarballs, not installed** (no new dependency).
- **`fake-indexeddb` added as a test-only dependency** (approved) so tests run the real Dexie code.
- **Colors are stored as category ids** (`movement`, `focus`...), not hex; all colors live in `tokens.css`.
- **Days are created once, then stored** (`days` table). Task edits reach existing days ONLY through
  `syncFutureDays`, never before today; blocks with a log are never rewritten; a field changed for one
  day only is kept (per-field comparison with the old task value).
- **Edit "This and future days"** ends the old task the day before (`activeTo`) and starts a changed copy;
  past blocks keep their plan and logs. API: `updateTaskFromDate`, `updateTaskForDay`, `deleteTaskFromDate`
  (an earlier date is treated as today). **A deleted routine keeps its row** with an end date so unopened
  past days still show it as Unknown; the Tasks list hides ended routines (`hasEnded`).
- **"This day only" cannot change notes or repeat**: occurrences have no plan-notes field (their `note`
  is the LOG note and a note counts as "logged"). **Deferred by agreement**: ask again when building
  Today/Day screens whether to add a per-day plan-notes field (needs a DB version 2 and the user's OK).
- **Duplicate on routines/one-offs opens a New block sheet; on an Inbox to-do it adds another to-do**
  (user's choice; the first version opened a sheet and was rejected).
- **44 px tap targets** override the design where it is smaller (day buttons, chips, short blocks).
- **End time is kept to the exact minute** (was rounded to 5; changed in step-5-fix); blocks cannot run past 11:59 pm (midnight not supported).
- **Native pickers** are invisible `<input type=time/date>` / `<select>` over drawn boxes (text follows 12/24 h).
- **Rejected:** a separate preview site (CLAUDE.md: the live site is the test site); committing straight
  to `main` (replaced by PRs); tagging the branch before merging (tag goes on merged `main`);
  storing data in Files as the live store (iOS cannot write there; backup via share sheet is planned);
  using the old `localStorage` for the Developer switch (stored in the Dexie `meta` table).
- **First-run "Or jot a to-do in the inbox"** opens `TodoSheet` over Today (not a move to Tasks): iOS only opens
  the keyboard when focus happens during the tap.
- **Step 5 rules:** 80 px an hour; block 1 px below its time, 3 px short; two-line layout from 50 px;
  min 30 px; overlap = side-by-side columns (visual min height counts); now line every 15 s (red, token `--color-now-line`), card every
  1 s and shows whole minutes left ("54 min left"), not seconds; "now" = the overlapping block that started last; card text includes am/pm; timeline widens for blocks
  outside the day hours; re-scroll to now on open, date change, or return after 60 s or more.

## 7. Commands

```bash
npm install            # once (Node >= 22.22; the machine has v24)
npm run dev            # http://localhost:5173/routine-tracker/#/  (no service worker, no network lock)
npm run check          # type check + lint + tests + build (what CI runs)
npm run typecheck | npm run lint | npm test | npm run build
npm run preview        # built app at http://localhost:4173/routine-tracker/ (service worker + network lock)
npm run icons          # redraws the placeholder icons in public/
```

**Latest results (branch step-7):** type check clean, lint clean, **401 tests in 21 files
pass**, production build passes (about 1 s). CI (`checks`) is green on PR #6.

Layout: `src/data/` (Dexie, API, rules, formatting), `src/app/` (shell, `BottomSheet`, `ActionSheet`,
`useNow`, `visibleArea`), `src/pages/` (screens; `tasks/`, `today/` subfolders), `config/` (PWA manifest,
security policy, tests that read tokens and design files), `.github/workflows/` (`deploy.yml`, `ci.yml`).

### 7b. Code map: reuse these, do not rewrite them

- **Data API** (`import { ... } from '../data'`): `listTasks, getTask, createTask, updateTask,
  updateTaskFromDate, updateTaskForDay, deleteTask, deleteTaskFromDate, taskLogCount, getDay (creates a
  day), peekDay (read only), updateOccurrence, getSettings/readSettings/updateSettings, getMeta/setMeta,
  counts, loadSampleData, eraseAllData, today()`. Helpers: `occursOn, hasEnded, isUnlogged, findOverlaps,
  formatTime/Range/Clock/HourLabel/Duration/Repeat/Day/DateLabel, toDateKey/addDays`, `categoryColor`.
  Types: `Task, Occurrence, Settings` (shapes in `CLAUDE.md`). Tests use `createDataApi({ db, now })` via
  `src/data/test-utils.ts` (`setup()` gives a fresh database and a movable clock).
- **Hooks:** `useLiveQuery(query)` and `useLiveQueryResult` (`src/data/useLiveQuery.ts`), `useNow(ms)`
  (`src/app/useNow.ts`, also refreshes on return to foreground).
- **UI parts:** `BottomSheet` (full or `fit="content"`, swipe/backdrop/Escape, keyboard-safe),
  `ActionSheet` (iPhone-style menu), `ComingSoonToast`, `PageHeader`, `SwipeRow`, `TaskSheet` (new /
  edit / duplicate / schedule modes), `TimeBox/DateBox/SelectBox` (native pickers).
- **Scoring (Step 7):** `src/scoring/` (pure: `scoreTask` = minutes of the actual time inside the planned time / planned minutes, `scoreDay`,
  `startedByFor`, `wholePercents`; tested against the spec's worked example: Logged 50%, Day 40/40/20), the Day review `src/pages/DayReviewPage.tsx` + `src/pages/review/` (`rows.ts` view-model,
  `nav.ts` back link, `ScoreCards.tsx`, `PlannedVsActual.tsx`), and the chip in `today/TodayHeader.tsx`. Open the review
  with `navigate(reviewPath(date), { state: reviewState('today' | 'calendar') })`.
- **Logging (Step 6):** `src/data/log.ts` (pure rules: stop/done/skipped/clear patches, elapsed time, off-plan tags,
  progress line, "Still doing" check; tested), data API `startTimer, stopTimer, runningTimers, peekOccurrence`,
  `src/pages/log/LogSheet.tsx` + `logForm.ts` (the Log time sheet), `useStartTimer.tsx` (the one-timer question),
  `src/app/StillDoingPrompt.tsx` (mounted in AppShell), `src/pages/today/actuals.ts` (the actual bars).
- **Today pieces:** `src/pages/today/plan.ts` (all timeline and Now/Next rules, unit tested),
  `Timeline`, `BlockView` (looks: current, upcoming, unknown, done, skipped), `NowNextCard`, `EmptyStates`.
- **Tokens:** every color, radius (`rounded-14`), font size (`text-13-5` = 13.5px) and shadow is in
  `src/styles/tokens.css`; add new colors there only.

### 7c. iPhone test log (fill in after each merge)

| Step | Tested on iPhone? | Result / notes |
| --- | --- | --- |
| 1 | yes | worked, Add to Home Screen worked |
| 2 | yes | Storage "Persistent" reported; Developer panel worked |
| 3 and fixes | yes | keyboard bug and Duration label wrap were found here and fixed |
| 4 | partly | red line under the arrow (fixed); swipe feel and Delete menu not reported |
| 7 | pending | walkthrough is in the Step 7 PR |
| 6 | pending | walkthrough is in the Step 6 PR (merged) |
| 5 | yes | play button too big on a 15-min block, End could not be 8:00 pm, now line too faint, countdown too busy: all fixed in `step-5-fix` (recheck on the phone) |

## 8. Known bugs, unverified items, flaky tests, gotchas

**Open issues**
- **Microsoft Edge on the user's computer:** the Developer panel did not open at one point (works on
  iPhone and Firefox). The panel now opens without waiting for the database and shows a red notice with the
  real error if the database cannot be read. Cause never confirmed (suspect an Edge/organization site-data
  setting). Low priority; record the Edge error message in PROGRESS.md if the user reports it.
- **Not yet checked on a real iPhone:** Steps 4 and 5 (swipe feel vs scrolling, Delete menu, locking and
  unlocking the phone, Home Screen app in airplane mode). The "red line under the arrow" bug (Delete button
  peeking out under rows) was fixed by hiding swipe buttons at rest; confirm on the phone.
- Block that runs past midnight is not handled. App icons are placeholders.
- `ComingSoonToast` is the standard "Coming soon" note (used on Today; also reusable for errors).

**Flaky-test lesson:** a test that created two tasks in the same instant with a fixed clock ordered them
randomly and failed on GitHub only. Advance the test clock between creations when order matters.

**Gotchas**
- **Lint is strict (React Compiler rules):** no `useMemo`/`useCallback` whose deps are freshly created objects
  ("Existing memoization could not be preserved"), no ref writes during render, no synchronous `setState` in
  effects, components-only exports in `.tsx` files (put helpers in separate files, e.g. `rowActions.tsx`).
- **Dexie `liveQuery` is read-only**: use `readSettings`, `peekDay`, not `getSettings`/`getDay`, inside it.
- **Service worker caches the old app:** when testing the built app in the browser pane, unregister the
  service worker and clear caches, then reload (the first load otherwise shows the previous build).
- **Browser pane:** screenshots in the 390 x 844 emulation come out at about half scale (page is correct;
  use DOM measurements with `javascript_tool`). A resize can reload the page and drop the `#/route`.
  Pretend clock: replace `window.Date` with a subclass whose `now()` is offset; the app's `useNow` picks it up.
- **Windows tooling:** PowerShell blocks `npm.ps1` unless `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
  (or use Git Bash / `npm.cmd`). Python is not installed. `gh` is not on PATH in the Bash tool, so load it
  in PowerShell with `$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
  [Environment]::GetEnvironmentVariable("Path","User")`. In PowerShell 5.1 pass multi-line PR bodies with
  `gh pr create --body-file <file>` (inline bodies get mangled). Bash heredocs containing backticks or
  `${}` break; write helper scripts with the Write tool into the scratchpad and run them with node.
- **gh login** is `devBizWork` with scopes repo, workflow, gist, read:org (workflow scope was needed to push
  workflow files).
- The folder can end up on the wrong branch between turns: always check `git branch --show-current` before
  committing (a Step 4 commit once landed on local `main`; fixed by `git branch -f`).
- The Developer "Load sample data" creates 14 tasks and 7 logged past days; today's blocks are created when
  Today opens. Sample one-offs sit on today and in two days.
- Data privacy guarantees: no `fetch`/XHR/cookies in `src`; CSP `connect-src 'none'` in the built page. Sites
  under the same `devbizwork.github.io` origin could read the database, so publish only trusted code there.

## 9. Memory files (outside the repo)

Saved in `C:\Users\Bob Zigga\.claude\projects\C--Users-Bob-Zigga-Documents-AI-Projects-routine-tracker\memory\`:
`pull-request-workflow.md` (branch/PR/tag rules and the tag gotcha) and `user-not-a-developer.md`. They
repeat points 2 and 3 above.
