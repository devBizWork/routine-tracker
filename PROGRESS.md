# Progress

## Steps done

- **Step 0:** computer set up (Git, Node, npm, GitHub CLI), Git repository created, first commit "Starter kit".
- **Step 4:** editing tasks, duplicate, delete, swipe actions, scheduling Inbox to-dos. Tag: `step-4`
  (added after the merge).
  - Tapping a row opens the sheet in edit mode: "Edit routine" or "Edit block" (one-offs), with
    Cancel, Save, Duplicate and Delete.
  - "Apply changes to" (repeating tasks only), default "This and future days", with the real date
    in the descriptions ("Changes Thu, Oct 8" / "From Thu, Oct 8 on").
    - **This day only:** changes just that day's block (title, color, start, length).
    - **This and future days:** the old routine ends the day before (`activeTo`) and a changed
      copy starts that day. Past blocks keep their plan and logs.
  - Duplicate opens a New block sheet with "<title> copy". Delete opens an iPhone-style menu
    ("Delete from today on" for routines, "Delete block", "Delete to-do"), saying logs stay in history.
  - Swipe left on any row for Duplicate and Delete; a tap elsewhere closes it (keyboard: Left arrow
    opens, Right arrow or Escape closes).
  - Inbox "Schedule" opens a New block sheet with the title filled in; saving moves it out of the Inbox.
  - 50 new tests cover both scopes against past, today and future dates, plus delete.
- **Step 3:** the Tasks tab and creating new tasks. Tag: `step-3` (added after the merge).
  - Tasks screen as designed: title with the task count; Inbox, Routines and One-off sections
    (rows show title, repeat label or date, start time and duration); the round + button.
  - Inbox quick add: type and press Return; empty or spaces-only text does nothing.
  - "New block" sheet: Title (autofocus), Start (native time picker), Duration (5 to 480 min in
    5-minute steps, plus quick chips) or End ("Set end time instead", kept in sync), Repeat
    (Once with a date, Daily, Weekdays, Custom with day buttons), Category, Notes, and a
    "Chime for this task" row marked Coming soon. Save needs a title and a start time.
  - Overlap warning ("Overlaps Deep work") that still lets you save.
  - Cancel / swipe down / backdrop tap / Escape ask "Discard this block?" only if something
    was typed or chosen.
  - Tapping a task row, Schedule, or swiping hints shows "Coming soon" (Step 4).
  - Reusable pieces for later steps: `BottomSheet`, `ComingSoonToast`, `useLiveQuery`.
  - New tests: form rules (`draft.test.ts`), overlaps, formatting. 174 tests in all.
- **Step 2:** on-device database and the rules that turn tasks into a day's plan. Tag: `step-2`.
  - `src/data/`: Dexie database (`tasks`, `occurrences`, `settings`, plus internal `days` and
    `meta` tables), default settings on first launch, and the API the screens use. Screens
    import from `../data` only (`getDay`, `listTasks`, `createTask`, `updateTask`,
    `deleteTask`, `updateOccurrence`, `getSettings`, `updateSettings`, ...).
  - Repeat rules in `repeat.ts`: once, daily, weekdays (Mon-Fri), custom days, limited to
    `activeFrom`..`activeTo` (both days included); inbox tasks never appear on a day.
  - Storage persistence is requested on every launch and the answer is saved.
  - Developer section in Settings (tap "Version" 5 times, quickly): counts, storage state, day
    inspector, Load sample data (14 tasks + 7 logged days), Erase all data (with confirm).
  - 119 unit tests, including the real database code run against a simulated IndexedDB.
- **Step 1:** project setup, app shell and live link. Tag: `step-1`.
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

- **Step 4 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with a real
  mouse drag for the swipe. Only the phone can confirm: the finger swipe feel and that it does not
  fight with scrolling, the Delete menu and its swipe-down, and the edit sheet with the keyboard open.
- **Duplicate on an Inbox to-do** opens a New block sheet ("<title> copy") as the step asked, so it
  needs a start time to be saved and ends up as a block, not as a second to-do in the Inbox. If you
  would rather it make a second Inbox to-do straight away, say so.

- Step 1 checked on a real iPhone: live site opens, Add to Home Screen works. Airplane mode
  was part of the walkthrough; no problems were reported.
- Step 2 was tested by the user: Storage said "Persistent" and the Developer section worked
  as expected. NOT yet confirmed which device that was (the code was not yet deployed when
  this was reported), so repeat on the iPhone Home Screen app after the Step 2 deploy.
  Chrome-style desktop browsers often say "Not persistent"; that is the browser's choice.
- After a new version is deployed, the first open of the app can still show the old version
  (the saved offline copy); it updates itself, so close and open the app once more.
- **Developer panel did not open in Microsoft Edge on the computer, but did on the iPhone**
  (reported after the Step 2 deploy; the tap hint showed but the panel did not). Cause not
  yet known. The panel now opens the moment the fifth tap lands (it no longer waits for the
  database) and shows a red notice with the real error if the database cannot be read. After
  the next deploy, open it in Edge and record the message here.
- **Step 3 fix (Duration label wrapped, "pm" on its own line): fixed, needs iPhone check.**
  On the New block sheet, "Duration · ends 8:28 pm" did not fit in a half-width box. Start and
  Duration now share the row 1 : 1.4 (Duration is wider) and both boxes keep their text on one
  line. Measured at 375 and 390 px with the longest captions ("Duration · ends 12:43 pm",
  "End · 2 h 15 min"): one line, with room to spare. Not yet seen on the real iPhone.
- **Step 3 fix (keyboard pushes the New block sheet off screen): fixed, needs iPhone check.**
  Found on the iPhone: opening the sheet opened the keyboard, and Safari slid the whole sheet
  up so Cancel, the title and Save went off the top. The sheet's frame now follows the part of
  the screen that is really visible (`visualViewport`, in `src/app/visibleArea.ts`): it shrinks
  above the keyboard, follows the page if Safari slides it, and scrolls a focused field into
  view. Simulated in a desktop browser (a pretend keyboard of 520 px and 420 px, and a 140 px
  slide); not yet confirmed with the real iPhone keyboard.
- **Step 3 not yet checked on the iPhone** (apart from the keyboard bug above). Tested in a desktop browser at 390 and 375 px only.
  Things only the iPhone can confirm: (1) tapping Start, End, Date or Duration opens the
  phone's own wheel picker (they are invisible native fields laid over the drawn boxes);
  (2) the keyboard and the sheet get along (Save is at the top, so it stays reachable);
  (3) the swipe-down feel; (4) nothing sits under the home indicator.
- A block that runs past midnight is not handled (times are "HH:mm" within one day).
- The app icons are placeholders (a clock drawn by `scripts/generate-icons.mjs`).
- No component tests yet: they need `jsdom` and `@testing-library/react`, which are not in the
  approved stack. Ask before adding them.

## Decisions made

- **Step 4 rules (in `src/data/api.ts`).**
  - **A deleted or replaced routine keeps its row** with an end date (`activeTo`) so days nobody has
    opened yet still show it as Unknown, and the Tasks list hides routines that have ended. A routine
    that only began today (nothing earlier to protect) is removed outright. Blocks with a log are
    never removed.
  - **Edits start no earlier than today.** `updateTaskFromDate` and `deleteTaskFromDate` treat an
    earlier date as today, so the past can never change through them. They take any date, ready for
    the Day screen later; the Tasks screen always passes today.
  - **Blocks from that date on move to the new copy**, including a block already logged today (its
    log stays, and there is still only one block that day). Unlogged blocks follow the edit field by
    field, so an earlier "this day only" change survives.
  - **"This day only"** can only change title, color, start time and length. If the repeat, date or
    notes were also changed, a note says those only apply with "This and future days". If the routine
    does not run today (for example a weekday routine on a Saturday), "This day only" is greyed out
    with "Not scheduled on <date>".
  - **A one-off or to-do that becomes repeating starts today**, never in the past.
- **Reusable pieces added:** `ActionSheet` (the iPhone-style menu, built on `BottomSheet` with
  `fit="content"`), `SwipeRow`, and a count of open sheets so a menu over a form does not unlock the
  page behind the form when it closes. `ComingSoonToast` is no longer used by any screen but stays
  for later steps.

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
- **Added dependencies (approved):** `dexie`, `date-fns` (both in the stack), and
  `fake-indexeddb` (test-only, so tests can run the real database code).
- **Days are created once, then stored.** `getDay(date)` creates a date's blocks the first time
  and records it in the `days` table. After that the day is only read, so a task made later
  never shows up on a day that already exists, and a block deleted from one day is not
  re-created. Task changes reach existing days only through `syncFutureDays` in `api.ts`.
- **A task change applies from today onward, never to earlier dates.** On create, update or
  delete, days from today on are brought in line: unlogged blocks follow the change (or are
  removed if the task no longer applies), blocks that already have a log (status, times, timer
  or note) are left alone, and a field changed on one day only is kept unless it still matched
  the task's old value. "Apply from a chosen later date" (needs splitting a routine in two)
  is left for the Add/Edit sheet step.
- **A repeating task starts today** (`activeFrom` defaults to today) so it cannot reach into
  days that have already happened. A one-off with a time but no date gets today's date.
- **`color` stores the category id** (`movement`, `focus`, ...), not a hex code, so the colors
  stay in `tokens.css`. The sample tasks are placed in the closest category by name.
- **Settings defaults** follow the Settings screen: sounds on, chime Bamboo, 5-minute warning on,
  end sound off, quiet hours on 10:00 pm to 7:00 am, keep screen on off, day 5:00 am to 11:00 pm,
  12-hour time, tolerances 10 min / 10% / 60 min.
- **`meta` table:** small per-device notes (Developer section on/off, storage result). Not part
  of future backups and kept when you press "Erase all data".
- **Five taps** on Version must follow one another within 3 seconds, and a small hint shows
  how many taps are left.
- **Database changes later:** add `this.version(2)` in `src/data/db.ts`; never edit version 1.
- **Step 3 design choices.**
  - **Tap targets are 44 px**, a little larger than the screens in a few places (day buttons,
    quick-duration chips, Repeat segments and Save were 38 to 40 px) to follow the 44 px rule.
  - **Native pickers:** Start, End, Date and Duration are real `<input type="time">`,
    `<input type="date">` and `<select>` elements, invisible and laid over the drawn boxes, so the
    text shown follows the 12/24-hour setting while the phone's own picker does the picking.
  - **End time is rounded to the nearest 5 minutes** (so the Duration picker can always show it);
    a block cannot run past 11:59 pm (midnight is not supported yet).
  - **A new block starts as Once, today, 30 min, category Focus.** Custom starts from the days
    that were showing; tapping a day on Daily or Weekdays switches to Custom with that day flipped.
  - **Inbox quick-add tasks** are Once, 30 minutes, category Focus, with no start time.
  - **Durations from 2 hours up** are written as hours ("2 h 15 min") in rows and the picker.
  - **One-off caption** reads "Swiping: coming soon" instead of "Swipe a row for more" (Step 4).
  - **`readSettings`** is a read-only way to follow settings from a screen (the existing
    `getSettings` writes when settings are missing, which a live query may not do).
- **Network lock (added after Step 2, on request).** The built page carries a Content Security
  Policy (`config/security.ts`, added by a build-only step in `vite.config.ts`) with
  `connect-src 'none'`: the browser refuses any fetch, beacon or socket from the app, even to
  this site, so no code (ours, a library, or a future mistake) can send data anywhere. Only our
  own scripts, styles, images and fonts load. The service worker is not covered by the page's
  rule; it only saves this site's own files. Tested in a browser: outside and same-site
  requests are blocked, the app, database, fonts and offline copy all still work, and the app
  opens with the server turned off. The dev server does not get the lock (it needs extra
  permissions to reload on save), so `npm run dev` behaves as before.
  **If a later step genuinely needs the network (it should not), this setting is where it
  would have to be loosened, on purpose.**
- **Limits of that lock:** it cannot stop other sites under the same `devbizwork.github.io`
  address from reading this database (same "building"), or anyone using your unlocked phone.
  Only publish code you trust under this GitHub account.
- `.gitignore` also ignores `routine-backup-*.json` and `routine-*.csv`, so exported backups
  are never committed to the public repository.
- **Pull request per step (from now on).** Each step is built on a branch `step-N`, pushed,
  and opened as a pull request. `.github/workflows/ci.yml` runs type check, lint, tests and
  build on the PR; merging to `main` is what deploys the live site (`deploy.yml`). The
  merge is clicked by you; the step tag is added after the merge. Steps 0 to 2 were committed
  straight to `main` before this rule.
- **Repository name lives in one place:** `REPO_NAME` in `config/app.config.ts`.
- `.gitattributes` forces LF line endings (removes the Windows LF/CRLF warnings).
  `.gitignore` also ignores `dev-dist`, `*.local` and `.claude/`.
