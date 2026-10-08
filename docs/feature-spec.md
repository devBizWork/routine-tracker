# Routine Tracker PWA — Feature Spec

Oct 6, 2026

## Overview

Routine Tracker is a time-blocking app for your phone: you divide your day into blocks of time for each task, follow those blocks as the day runs, and use what actually happened to build a schedule you can keep.

- **Time blocking at the center.** Every task gets a start time and a duration, and the day is laid out as a timeline of blocks, so the whole plan is visible at a glance.
- **Built to refine your schedule.** Logging actual times and scoring adherence show where your plan and your day differ, so each week's schedule fits better than the last.
- **Routines as reusable blocks.** Recurring blocks, such as a morning workout or a deep-work session, repeat automatically, so your schedule becomes a template you adjust instead of rebuilding every day.
- **Private and offline.** No account or server: data stays on the phone, with backups saved to the Files app. Installed from Safari to the Home Screen (iPhone assumed; Android noted where it differs).

The core loop:

1. **Block out the day:** place tasks and routines on the timeline with start times and durations.
2. **Follow the blocks:** the now line shows which block you should be in, and a chime marks each change.
3. **Log what happened:** record when each block actually started and how long it took.
4. **Review and adjust:** two adherence scores show how closely you kept to your blocks, pointing to what to resize or move in tomorrow's schedule.

## Core features

Five features make up v1: a to-do list of tasks and routines, a day timeline calendar, time logging, adherence scoring, and task-change sounds.

### 1. To-do list: tasks and routines

- **Add a task** with a title, planned start time, planned duration (or end time), color or category, and optional notes.
- **Repeat options:** one-off, daily, weekdays, or chosen days of the week.
- **Unscheduled to-dos** sit in an inbox list until given a time, then appear on the calendar.
- **Edit, duplicate, delete.** Editing a routine asks "This day only" or "This and future days" so past days keep their original plan.

### 2. Calendar with a day timeline

- **Calendar view** (month grid plus a week strip) to pick a day; each day shows a small adherence indicator.
- **Day timeline:** a vertical time axis (default 5:00 am to 11:00 pm, adjustable) with each task drawn as a block placed at its start time and sized by its duration.
- **Now line:** a horizontal line at the current time that moves in real time on today's view. The task it crosses is highlighted, with a pinned card showing "Now" and "Next" plus time remaining.
- **Planned vs. actual:** once a task is logged, its actual time appears as a second bar beside the planned block, so drift is visible at a glance.
- **Unknown marker:** past tasks with no log show a distinct "Unknown" style, not "missed".

### 3. Logging actual time spent

- **Quick actions on a task:** Start/Stop timer, "Done as planned" (one tap copies the planned times), "Skipped", or enter start and end times by hand.
- **Partial completion:** log less time than planned; the score reflects it.
- **Log later:** an end-of-day "Review today" flow steps through each unlogged task so you can fill gaps in under a minute.
- **Optional note** per log entry.

### 4. Adherence scoring

- **Two scores per day** so missing logs never silently count as failure: a Logged score and a Day score (detailed in the next section).
- **Trends:** weekly and monthly view of both scores and of how much of each day was logged.

### 5. Task-change sounds

- **Chime when the planned task changes,** with optional extras: a 5-minute warning and an end-of-task sound.
- **Toggle in two places:** a master switch in Settings and a quick mute button in the Day view header.
- **Sound choice:** pick from a few built-in chimes, with an optional per-task override (a different chime, or silent).
- **Quiet hours** (optional): no sounds between set times.

## Adherence scoring

Each day gets two scores: the **Logged score** (how well you followed the plan on the tasks you recorded) and the **Day score** (how much of the whole plan is confirmed followed, with unlogged time kept apart as Unknown).

### Per-task score

A skipped task scores 0%. A done task earns 50% for doing it, plus up to 25% for starting on time and up to 25% for matching the planned duration.

```
Task score = 0.5 + 0.25 T + 0.25 D
```

- **T (timing):** 1 if the task started within 10 minutes of plan, falling evenly to 0 at 60 minutes early or late.
- **D (duration):** 1 if the actual time was within 10% of plan, falling evenly to 0 at zero time or double the plan.
- **Weighting:** tasks count by planned minutes, so a 2-hour block matters more than a 10-minute one.
- **Tolerances** (10 min, 10%, 60 min) are adjustable in Settings.

### The two calculations

```
Logged score = sum over logged (w_i * s_i) / sum over logged (w_i)
Followed     = sum over logged (w_i * s_i) / sum over all planned (w_i)
```

Here w is a task's planned minutes and s is its task score.

- **Logged score:** "Of what you logged, here's how well you followed your plan." Always shown with its coverage, such as "Based on 160 of 200 planned minutes."
- **Day score:** splits the whole plan into three parts that add to 100%: **Followed**, **Missed** (logged but off-plan or skipped), and **Unknown** (not logged). The true result lies between Followed (if every unknown was missed) and Followed + Unknown (if every unknown went to plan).

Display rules:

- **Fully logged day:** Unknown is 0% and both scores match, so show one number.
- **Nothing logged:** the Logged score shows "–" and the Day score bar is 100% Unknown.
- **Today in progress:** only tasks whose planned start has passed are counted.

### Worked example

| Task | Planned | Logged | Task score |
| --- | --- | --- | --- |
| Workout | 6:30–7:30 am (60 min) | 6:30–7:30 am | 100% |
| Deep work | 9:00–10:20 am (80 min) | 10:00–11:20 am, started 60 min late | 75% |
| Walk | 12:00–12:20 pm (20 min) | Skipped | 0% |
| Reading | 9:00–9:40 pm (40 min) | Not logged | Unknown |

Logged score: 75%, based on 160 of 200 planned minutes. Day score: 60% followed, 20% missed, 20% unknown, so the real result is somewhere between 60% and 80%.

## Screens

Eight screens cover v1, with Today as the home screen and a bottom tab bar for Today, Calendar, Tasks and Settings.

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Today (home) | Follow the plan live | Date header with Day score chip and sound mute button; vertical timeline with task blocks and the moving now line; pinned Now/Next card with time left; quick log buttons on each block |
| Calendar | Pick a day, see patterns | Month grid and week strip; each day shows a small adherence ring or color; tap a day to open its timeline |
| Tasks | Manage the to-do list | Routines and one-off tasks grouped; unscheduled inbox; add button; repeat and time shown on each row |
| Add / edit task (sheet) | Create or change a task | Title, start time, duration, repeat days, color, sound override, notes; "This day only / This and future days" choice on edit |
| Log time (sheet) | Record what happened | Start/Stop timer; Done as planned; Skipped; manual start and end; note |
| Day review | See how the day went | Logged score with coverage; Followed / Missed / Unknown bar with the possible range; per-task list of planned vs. actual; "Log remaining tasks" button |
| Trends | Track adherence over time | Weekly and monthly charts of both scores and of logging coverage; most-skipped tasks |
| Settings | Configure the app | Sounds (master toggle, chime choice, test button, 5-min warning, quiet hours); day hours; 12/24-hour time; scoring tolerances; Backup and restore (export to Files, import, last backup date) |

States:

- Empty day and first-run (no tasks yet), plus an "Add to Home Screen" walkthrough, since iPhone shows no automatic install prompt.
- Task in progress, upcoming, done as planned, done off-plan, skipped, and Unknown.
- Sounds muted vs. on, and the "tap to enable sounds" prompt.
- Backup reminder banner when the last backup is more than 7 days old.

## Data storage and the Files app

Live data sits in the app's own on-device database, and the Files app holds backup files you save and restore. Safari on iPhone does not let a web app write straight into Files, so backups go through the share sheet.

- **Live store:** IndexedDB, fast and fully offline. Installing to the Home Screen also helps protect it from Safari clearing data.
- **Save to Files:** "Export backup" creates a file such as `routine-backup-2026-10-06.json` and opens the share sheet, where you choose Save to Files and a folder (for example iCloud Drive › Routine).
- **Restore from Files:** "Import backup" opens the Files picker; choose a backup, then pick Merge or Replace.
- **Backup reminder:** a banner with one-tap export when the last backup is older than 7 days (adjustable).
- **Spreadsheet export** (optional): logs as a CSV file for Numbers or Excel.
- **Android:** Chrome on Android supports folder access, so there the app can save backups to one granted folder automatically.

Data model:

| Record | Key fields |
| --- | --- |
| Task | id, title, color, start time, planned minutes, repeat days, active from/to dates, sound override, notes |
| Occurrence (one task on one date) | task id, date, planned start and minutes (copied from the task), status, actual start, actual end, note |
| Settings | sound on/off, chime choice, 5-min warning, quiet hours, day hours, time format, scoring tolerances, last backup date |

Copying the plan into each occurrence keeps past days accurate when a routine is edited later.

## Platform limits that shape the design

Sounds play only while the app is open on screen: a web app can't schedule a sound or alert for later without a push server, which this local-only app doesn't have.

- **Keep screen on:** an optional toggle that holds the screen awake during the routine, where the phone supports it, so chimes keep firing.
- **Catch-up on reopen:** when the app opens after being closed, the now line jumps to the current task and a short "While you were away" note lists task changes that passed silently.
- **Tap to enable sounds:** iPhone won't play web audio until you tap something, so turning sounds on (or a "Test sound" button) also unlocks audio.
- **Silent mode:** chimes may be muted when the iPhone's Silent switch is on; the Sounds setting should say so.
- **Always offline:** no network loading states are needed.
- **Local wall-clock times:** a 7:00 am task stays at 7:00 am after travel or a clock change.

## Later

Left out of v1: alerts while the phone is locked (needs a push server), sync across devices, and importing from other calendars.
