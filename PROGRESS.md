# Progress

## Steps done

- **Step 0:** computer set up (Git, Node, npm, GitHub CLI), Git repository created, first commit "Starter kit".
- **Step 9:** the Calendar tab and viewing any day. Tag: `step-9` (added after the merge).
  - **Calendar** (`CalendarPage.tsx`, from `Calendar.html`): month title, previous and next month, a Monday-first grid
    with today marked, a small ring on each day with a score (Followed blue and Missed apricot from the Step 7 Day
    score), the legend, and the Trends button (Coming soon until Step 10).
  - **Day summary card** for the selected day: weekday and date, "4 blocks · 200 min", the Day score (headline
    number), the Followed / Missed / Unknown bar and line, the Logged score with "160 of 200 min logged", and Open
    timeline and Review day. Days to come show only how many blocks are planned (no score, no Review day); days before
    any data show nothing.
  - **Day screen** at `#/day/:date` (`DayPage.tsx`, from `Day.html`): back to Calendar, Review link (past days), the week
    strip (tap to switch days, rings on each), the score card that opens Day review, and the timeline with planned
    blocks and actual bars, opened at the first block. Past days can be logged (Log time, without "Start timer"); days
    to come have no play buttons and their blocks open the edit sheet on "This day only". Today's date goes to the
    Today tab. The Calendar tab stays highlighted on a Day screen.
  - The Calendar remembers the month and the selected day while the app is open.
  - All rings and cards use `scoreDay` (Step 7); a day never opened shows its plan from the tasks, worked out in memory
    without saving anything. New read-only data call `peekRange(from, to)`.
  - 14 new tests (435 in all) in `src/pages/calendar/month.test.ts`.
- **Step 8:** logging later, and catching up when the app was closed. Tag: `step-8` (added after the merge).
  - **Review today sheet** (`src/pages/review/ReviewSheet.tsx`, from `ReviewFlow.html`), opened from "Log remaining tasks"
    on the Day review: steps through each unlogged block whose planned end has passed, in time order, with the
    progress bar and "2 of 4", the block card (ROUTINE or ONE-OFF) and "What happened?": Done as planned, Done at
    other times (Started and Ended open inline, then Save; Ended must be after Started), Skipped, Not sure (leave
    Unknown) and Back. Each answer is saved at once, then a status line ("Plan the day · done as planned") with Undo
    appears and the next block slides in. After the last block an "All caught up" card shows the updated Day score;
    Done goes to the Day review. Close keeps every answer already given.
  - **While you were away** (`src/pages/today/AwayCard.tsx`, from `WelcomeBack.html`): the app notes when it was last
    in front (`src/app/away.ts`, every 30 seconds and when it goes to the background, kept in the database so it
    survives closing). When it comes back after at least a minute away and blocks started or ended meanwhile, Today
    shows the time span, those blocks with their status (Done, Skipped, Unknown, Now, Timer on), "Log these N now"
    (Review today for just the Unknown ones) and Dismiss. Shown once per absence.
  - The "Tap to turn on sounds" banner from the same design stays hidden until Step 11.
  - 20 new tests (421 in all) in `src/pages/review/flow.test.ts`.
- **Step 7 fix 4 (plan bar back to grey-blue):** navy overpowered the green, so the plan bars are back to the original grey-blue (#CBE2E8, token `--color-plan-bar`); actual bars stay green and both stay 8 px thick. Also in this branch: the "Real result: 52–64%" bracket above the Day score bar is removed (it looked like it was selecting the orange Missed part, which it was not). The range is still worked out by `scoreDay` and can come back later. Branch `step-7-fix-plan-bar`.
- **Step 7 fix 3 (bar colours stand out):** on the Day review every plan bar is now navy (#1E3A8A, token `--color-plan-bar`) and every actual bar is green (#1F9D55, token `--color-actual-bar`, time done), both a little thicker (8 px). The legend matches. Branch `step-7-fix-bar-colors`.
- **Step 7 fix 2 (what the percentage means):** a block planned 2:50 to 3:08 pm with 2:53 to 2:57 pm logged scored 81%,
  because the old rule gave 50% for doing it and 25% for starting on time before counting the length. Now a block's
  score is **how much of its planned time you spent on plan, at the time it was planned** (the minutes the actual time
  overlaps the planned time, divided by the planned minutes): that block is 22%. Done exactly as planned is 100%,
  late or early only counts the part inside the plan, a skipped block is 0%, and running longer is not punished in
  the score (the "+15 min" tag shows it). Followed on the Day score is now simply the minutes spent on plan out of the
  planned minutes. `docs/feature-spec.md` is updated; the worked example is now Logged 50% (based on 160 of 200
  minutes), Day 40% followed, 40% missed, 20% unknown, real result 40–60%. The review says in words what each
  percentage means. The old timing and duration credits (and the 60-minute zero-credit setting) are no longer used by
  the score; the 10-minute and 10% tolerances still decide when a block is tagged as off plan. Branch
  `step-7-fix-score`. (`design/screens/DayReview.html` still shows the old numbers; the layout is what we follow.)
- **Step 7 fix (bar colours on the Day review):** the Planned vs actual bars used a different colour on every row
  (the plan bar took the block's category colour, the actual bar was blue or apricot, skipped was an outline,
  not logged was striped). Now every plan bar is the same grey-blue and every actual bar is the same blue, as the
  legend says. A block with no actual time (skipped, not logged) draws no actual bar; its words and score pill say
  why. How far a block drifted is still told by the apricot note under it. Branch `step-7-fix-colors`.
- **Step 7:** the two adherence scores and the Day review screen. Tag: `step-7` (added after the merge).
  - **Scoring** (`src/scoring/`, pure functions with no screens or database): task score
    `0.5 + 0.25 T + 0.25 D` (a skipped block scores 0), timing credit T and duration credit D from the Settings
    tolerances (10 min, 10%, zero credit at 60 min), weighting by planned minutes, the Logged score with its coverage
    minutes, and the Day score split into Followed / Missed / Unknown. The three whole percentages always add up to
    exactly 100 (the largest remainders round up).
  - **Today rule:** on today only blocks whose planned start has passed count; a past day counts every block and a
    future day none.
  - **Display rules:** a fully logged day shows one number (no Unknown, no range); with nothing logged the Logged score
    is "–" and the Day bar is 100% Unknown; with nothing to count the review says "Nothing to score yet".
  - **Day review** at `#/day/:date/review` (`DayReviewPage.tsx`, from `DayReview.html`): a back link, the Logged score
    with "Based on 160 of 200 planned minutes", the Day score with the three-part bar, "Real result: 60–80%" and the
    legend, "Planned vs actual" with each block's score, two thin bars on a shared time scale and a note such as
    "Started 60 min late · length on plan", and "Log remaining tasks" with a count badge (Coming soon until Step 8;
    hidden when nothing is left to log). Back returns to Today or the Calendar, whichever opened it; opened directly
    it returns to Today. A bad date in the address goes to Today.
  - **Wired in:** the Today Day score chip (a ring of Followed blue and Missed apricot, the score so far, tap opens
    the review), the "Task score" on the Log time sheet (follows what is typed), and the "Day done" Review day button.
  - 66 new tests (408 in all): `src/scoring/scoring.test.ts` reproduces the worked example exactly (Logged 75% on
    160 of 200 minutes; Day 60 / 20 / 20, range 60–80%) and covers 0 planned minutes, all skipped, more than double the
    length, starting early, the Today rule and the rounding; plus the review rows and the back link.
- **Step 6:** logging what actually happened, the timer, and how each block shows its status. Tag: `step-6`
  (added after the merge).
  - **Log time sheet** (`src/pages/log/LogSheet.tsx`, from `LogTime.html`): the block (colour, title, planned
    time), a Close button, "Done as planned" (copies the planned start and end), "Skipped", Started and Ended with
    the phone's own time pickers, the progress line ("57 of 90 min · partial", "Task score –" until Step 7), an
    optional Note and Save log. A block that already has a log opens filled in, with a "Clear log" link that asks
    first and returns the block to Unknown. Closing with unsaved changes asks "Discard your changes?".
  - **Timer:** Start saves `timerStartedAt` (a moment, not a counter). The sheet shows "TIMER RUNNING", the elapsed
    time, "Started 9:15 am · 15 min after plan" and a STOP button; the elapsed time is always worked out from the
    saved start, so it is right after the app was closed. Stop saves Started and Ended, marks the block done and
    leaves the sheet open with both filled in. A block with no log also has a "Start timer" card in the sheet.
  - **One timer at a time:** starting another asks "Stop Deep work and start Client check-in call?" (the first
    timer's time is saved to its log). Cancel keeps the first one running.
  - **"Still doing Deep work?"** (`src/app/StillDoingPrompt.tsx`, for the whole app): a timer still running 2 hours
    after the block's planned end is asked about when the app is opened or comes back to the front, never while it
    is in use. "Stop at planned end" saves the log with the planned end; "Keep going" leaves it running until the
    app is next opened.
  - **Block looks on Today** (`BlockView.tsx`, from `States.html`): upcoming (play starts the timer), in progress
    (outline, "Timer 57:12 · since 9:15", stop opens the sheet), done as planned (blue check), done off plan (apricot
    check and a tag such as "+15 min", "−33 min" or "Started 60 min late"), skipped (grey, struck through) and
    Unknown (striped, dashed edge). A thin **actual bar** left of each logged block shows the time really logged (blue
    when it matches the plan, apricot when it drifted; a running timer draws a bar up to now).
  - **Tapping a block:** a past, current or already logged block opens Log time; a block still to come opens the
    edit sheet with "This day only" already selected. The round button starts the timer on a current or coming
    block and opens Log time on the others.
  - 74 new tests (342 in all): the logging rules (`src/data/log.test.ts`), the timer against the real database code
    (`src/data/step6.test.ts`), the form rules (`logForm.test.ts`) and the actual bars (`actuals.test.ts`).
- **Step 5 fix 2 ("Or jot a to-do in the inbox"):** found on the iPhone's first-run screen. The link only
  moved to the Tasks page; the keyboard did not open there (iOS only opens it when the field is focused
  during the tap itself, and this focused it after moving screens). It now opens a small "New to-do" sheet
  over Today (`TodoSheet.tsx`, keyboard opens with it). Return or Add puts the to-do in the Inbox and then switches to the Tasks tab, so the
  person sees where it went. Cancel with text typed asks "Discard this to-do?". The old
  `focusQuickAdd` navigation code was removed. Branch `step-5-fix-todo-sheet`.
- **Step 5 fix (after the first iPhone test):** four things found on the phone. Branch `step-5-fix`.
  - **Play button too big:** on a short running block (a 15-minute block is about 30 px tall) the round
    play button and the second text line stuck out of the block. A running block now has two lines only
    when it is 50 px or taller (about 40 minutes), and its round button shrinks to fit the block
    (22 px in a 15-minute block, 36 px as before in a tall one). The tap area stays 44 px.
  - **End time could not be set to 8:00 pm:** End was rounded to the nearest 5 minutes, so with a start of
    7:06 pm, typing 8:00 pm (54 min) snapped back to 8:01 pm (55 min). End is now kept to the exact minute;
    the Duration list adds any length that is not on its 5-minute grid (such as 54 min).
  - **Now line:** now red (new token `--color-now-line`, #D7263D, white time label 4.96:1), 3 px thick with
    a white edge, a larger dot with a soft halo, and a slightly bigger time label.
  - **Countdown:** the Now card no longer counts seconds. It says "54 min left" (whole minutes, rounded up,
    "2 h 5 min" from two hours on, never "0 min" while the block runs).
- **Step 5:** the Today screen as a live timeline. Tag: `step-5` (added after the merge).
  - Header: the full date, "Today", the Day score chip showing "–" and the sound button (both say
    "Coming soon" when tapped until Steps 7 and 11).
  - A timeline from Settings dayStart to dayEnd with an hour label and line for each hour. Blocks are
    placed by start time, sized by length (80 px an hour, as in the design), in their category color,
    showing the title and "6:30 – 7:30 · 60 min". Blocks that overlap in time sit side by side.
  - The now line (with a time label) moves every 15 seconds. The block it crosses gets the in-progress
    look (outline, shadow, NOW badge). The timeline opens scrolled so the line is a third of the way down.
  - The pinned Now / Next card: block, time left in whole minutes (changed in the Step 5 fix), progress bar, next block. Also "First up: …
    at …", "Free until … · Next: …" and "Day done" (with a Review day button, Coming soon).
  - Empty states: no tasks at all shows the first-run screen ("Add a time block" opens the New block
    sheet; "Or jot a to-do in the inbox" opened the Tasks tab; changed in Step 5 fix 2 to a New to-do sheet); tasks but none
    today shows "Nothing planned today" with an Add button.
  - Block taps and the round quick buttons say "Coming soon" (Step 6).
  - The screen refreshes when the app returns to the foreground and at midnight.
  - 37 new tests for the timeline rules (`src/pages/today/plan.test.ts`) and the time labels.
- **Step 4:** editing tasks, duplicate, delete, swipe actions, scheduling Inbox to-dos. Tag: `step-4`
  (added after the merge).
  - Tapping a row opens the sheet in edit mode: "Edit routine" or "Edit block" (one-offs), with
    Cancel, Save, Duplicate and Delete.
  - "Apply changes to" (repeating tasks only), default "This and future days", with the real date
    in the descriptions ("Changes Thu, Oct 8" / "From Thu, Oct 8 on").
    - **This day only:** changes just that day's block (title, color, start, length).
    - **This and future days:** the old routine ends the day before (`activeTo`) and a changed
      copy starts that day. Past blocks keep their plan and logs.
  - Duplicate on a routine or one-off opens a New block sheet with "<title> copy"; on an Inbox to-do
    it adds another to-do to the Inbox. Delete opens an iPhone-style menu
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

- **Step 9 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with sample data. Only the
  phone can confirm the feel of the month grid and the week strip under a finger.
- **No "Real result" range on the Calendar card or the Day screen**, although Step 9 asked for it, because it was taken
  off the Day review in the Step 7 fixes. `scoreDay` still works it out; it can be shown as text ("could be up to 80%").
- **The Day screen does not show the dashed "Actually 10:00 – 11:20" outline or the per-block score text** from
  `Day.html`; it uses the same block looks and actual bars as Today.

- **Step 8 not yet checked on the iPhone.** Tested in a desktop browser at 390 px with a pretend clock and simulated
  absences. Only the phone can confirm that closing the Home Screen app and opening it later shows "While you were
  away", and the native time pickers in "Done, at other times".
- **The app bundle is now 508 kB**, just over Vite's 500 kB advice, so the build prints a size warning. It is only a
  warning (the app is still precached for offline use). Splitting it would mean changing the build settings; ask first.

- **Step 7 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with a pretend clock and the
  spec's worked example added to a day: the review matches the numbers in the spec, the chip, the Task score while
  typing times, the three display states, a bad date, and the back link. Only the phone can confirm the look in the
  Home Screen app and the scrolling of the review.
- **No tab is highlighted on the Day review**, because its address (`#/day/...`) is not one of the four tabs.
- **The Calendar cannot open a review yet** (the Calendar arrives in Step 8); the back link already supports it.

- **Step 6 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with a pretend clock: every
  block look, the actual bars, starting and stopping a timer, the one-timer question, "Done as planned", "Skipped",
  typed times (and the "Ended must be after Started" message), Clear log, prefilled logs, the "Still doing...?"
  question, and a coming block opening the edit sheet on "This day only". Only the phone can confirm: the native
  time pickers on Started and Ended, the keyboard with the Note field, the timer after locking the phone or closing
  the app for a while, and that "Still doing...?" appears when you reopen the Home Screen app.
- **A log stays inside one day.** A timer running past midnight is saved ending at 11:59 pm of its own day.
- **Today only.** Logging exists for Today's blocks. Other days arrive with the Calendar and Day screens.

- **Step 5 fix 2 not yet checked on the iPhone.** In a desktop browser at 390 px the sheet opens over Today with
  the field focused, Add is disabled until something is typed, Return adds it, the screen switches to Tasks
  and the to-do is in the Inbox. Still to confirm on the phone: the keyboard opens with the sheet.

- **Step 5 fix not yet checked on the iPhone.** Measured in a desktop browser at 390 px with a pretend
  clock: a 15-minute running block (30 px) holds its 22 px play button with 4 px to spare and a 44 px tap
  area; the Now card shows "10 min left". Still to confirm on the phone: the End field now accepts 8:00 pm
  from a 7:06 pm start, and how the red line looks outdoors.

- **Step 5 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with a
  pretend clock to reach every state of the Now / Next card, the midnight rollover and returning to the
  app. Only the phone can show: how the screen behaves when you lock and unlock it or switch apps, the
  scrolling feel, and that it all works as a Home Screen app in airplane mode.
- **Block looks beyond Step 5.** A block that is over and has no log shows as "Unknown". Blocks that
  already have a log show as done (check) or skipped (greyed, struck through), but the thin actual bar,
  the "+15 min" off-plan tag and the running-timer chip from the design arrive with logging in Step 6.

- **Step 4 not yet checked on the iPhone.** Tested in a desktop browser at 390 and 375 px with a real
  mouse drag for the swipe. Only the phone can confirm: the finger swipe feel and that it does not
  fight with scrolling, the Delete menu and its swipe-down, and the edit sheet with the keyboard open.

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

- **Step 9 rules (in `src/pages/calendar/month.ts`).**
  - **"Before any data"** means before the first day ever opened or the day the earliest task was made, whichever is
    earlier.
  - **Changing month** selects today if it is in that month, otherwise the 1st.
  - **Today on the Calendar** uses "so far" (only started blocks count, like the chip); the "4 blocks · 200 min" line
    counts the whole day.
  - **The remembered month and day** last while the app is open (not after it is closed).

- **Step 8 rules (in `src/pages/review/flow.ts`).**
  - **"Log remaining tasks" and Review today** cover blocks with nothing logged whose planned end has passed (a block
    still going on, or with a timer running, is not "left to log"). The badge count uses the same rule.
  - **Undo** puts back exactly what the block had before that answer; **Back** shows the previous block again so its
    answer can be changed. Not sure saves nothing.
  - **"Done"** on All caught up goes to the Day review, from Today too.
  - **Away** means at least one minute without the app in front. A block "passed" when it started or ended during that
    time. A second absence before the card is dealt with is joined onto the first. Dismiss or "Log these N now" ends it.

- **Step 7 rules (in `src/scoring/`).**
  - **Task score** (changed in Step 7 fix 2, replacing timing credit T and duration credit D): the share of the planned
    minutes your actual time overlaps. Longer than planned is not punished in the score.
  - **Unknown** is any counted block with no log, including one whose timer is still running; a running timer is not
    counted in the "Log remaining tasks" badge (it is being logged).
  - **The chip and the big Day number show Followed**; the Logged score is the other card. With nothing logged both show
    "–" (not 0%, which would read as failure). The review's Real result range is Followed to Followed + Unknown.
  - **A fully logged day** shows one card ("Day score") with the Logged number, a Followed / Missed bar and no
    Unknown row.
  - **Score pill colours:** 100% blue, 0% pale apricot, in between neutral, Unknown dashed. New token
    `--color-missed-soft` (#FFF0E4) for text in `--color-missed-text`.
  - **Opening a review creates that day's blocks** if they were not made yet (the first time a date is needed).

- **Step 6 rules (in `src/data/log.ts`).**
  - **Stop saves at once.** Stopping a timer saves Started and Ended and marks the block done straight away, so a
    log is never lost; the sheet stays open to adjust the times or add a note, and Save log saves those edits.
  - **Off plan means:** the start is more than the on-time tolerance (10 min) from the planned start, or, if the
    start was fine, the length differs from the plan by more than the length tolerance (10%). Both come from Settings.
    A late or early start is shown before the length ("Started 60 min late" wins over "+15 min").
  - **A timer stopped within its first minute** is saved as one minute, so Ended is always after Started.
  - **Tapping:** a block that already has a log, or a timer, always opens Log time, even if it is still to come
    (the edit sheet is only for a block with no log that has not started).
  - **Started and Ended are disabled while the timer runs** (Started shows when it began, Ended shows "now").
    Save log then saves only the note and the timer carries on.
  - **A timer cannot start on a block that already has a log** (Clear log first); Skipped and Done as planned stop a
    running timer.
  - **"Still doing...?"** counts 2 hours from the planned end, or from the timer's own start if it began after the
    planned end. "Stop at planned end" for a timer that began after the planned end keeps the planned length.
  - **Note-only logs** are not saved without times (Save log stays off); a note typed before Done as planned,
    Skipped or Stop is saved with them.

- **Step 5 rules (in `src/pages/today/plan.ts`).**
  - **Scale and spacing copied from Main.html:** 80 px an hour; a block starts 1 px below its time and
    ends 3 px short; a 30-minute block is 37 px tall. A block is one line (title and time) below 50 px
    and two lines (title, then time and length) at 50 px or more. A very short block is at least 30 px.
  - **The timeline widens** (to whole hours) to include a block outside the day hours in Settings, so a
    4:30 am workout is never out of reach.
  - **Overlap:** blocks that overlap in time share the width side by side (two overlapping get half
    each; three get a third). Blocks that only touch do not overlap. A block shorter than the minimum
    height counts as taking that height, so it never draws over the next block.
  - **Now line:** moves every 15 seconds; its label is the minute in progress without am/pm ("10:15",
    "21:20" in 24-hour time). The card's countdown updates every second.
  - **Which block is "now":** if several overlap the now line, the one that started last. Every block
    the line crosses gets the in-progress look.
  - **Card wording** always includes am/pm in 12-hour time ("Free until 10:30 am · Next: …").
  - **Opening and coming back:** the timeline scrolls to the now line when it first appears, when the
    date changes, and when you return after the app was away for a minute or more. A shorter trip away
    refreshes the clock and card but leaves your scroll position alone.
  - **Today's blocks are created on open** (`getDay`), like any day; tasks added later appear at once.
  - **Tap areas:** a short block gets an invisible tap area of at least 44 px.

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
- **Duplicate on an Inbox to-do adds another to-do** to the Inbox straight away ("<title> copy", same
  category, length and notes, no time), with no sheet. Duplicate on a routine or one-off still opens a
  New block sheet. (Decided by you after the first version of this step.)
- **Swipe buttons are hidden until a row is open.** Found on the iPhone: a thin red line under the
  arrow of some rows. The red Delete button sits behind each row, and a row whose height ends on a
  fraction of a pixel (such as 64.25 px) can show a hair of it along the bottom edge. The buttons are
  now `visibility: hidden` at rest (they show while open, while dragging, and for the 0.2 s it takes
  to slide shut).
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
  - **End time is kept to the exact minute** (changed in the Step 5 fix; it used to round to 5 minutes,
    which made 8:00 pm unreachable from a 7:06 pm start). The Duration picker adds off-grid lengths.
    A block cannot run past 11:59 pm (midnight is not supported yet).
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
