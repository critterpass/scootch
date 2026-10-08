# Phase 03: The set task

Status: not started · Tasks: 5 · Needs: 01, 02
Owns: `apps/mobile/src/features/one-screen/task-set-dock.tsx`,
`apps/mobile/src/features/one-screen/task-set-shown.tsx`,
`apps/mobile/src/features/one-screen/minutes-control.tsx`,
`apps/mobile/src/features/dump/dump-panels.tsx` (energy step),
`apps/mobile/src/features/surfaces/notification-responses.ts`,
`apps/mobile/src/screens/registry/one-screen-task-set-*.tsx` (new files),
`apps/mobile/src/i18n/`, `docs/undesigned-states.md`

Board: section 01 (four screens) and section 02 (three). The board's treat
row and length pills are not built; see the plan's Decided table.

Goal: four quiet helpers around Start. Untouched, the set task looks and
behaves as it does today. Follow the layout memory: actions in the one dock,
composers as sheets, chips or icon buttons, never bare text.

### 1. Ends at
- Do: under the length wheel, "Ends at 3:42" in the quiet grey, from the
  phase 01 function, updating as the wheel turns. With a cue set it reads
  "Back after lunch, around 1:10". Read by VoiceOver with the length.
- Status: not started

### 2. Guess
- Do: a Guess chip in the dock opens a sheet, "How long would this take?",
  with five steps (30 min, 1 hour, 2 hours, 3 hours, Half a day), a "Guess 2
  hours" button and Skip. The chip then reads "2 hours". Absent on a serious task.
- Status: not started

### 3. When
- Do: a When chip opens "When should I bring it back?": Now, After
  something (coffee, lunch, work, dinner, Before bed), or At a time; the
  button reads "Bring it back after lunch". With a cue set the chip reads
  "After lunch" and the dock holds two buttons, "Start now" and "Save for
  later". Save for later schedules the cue through the notification plan and
  leaves the thing set. The cue's notification ("Tap to start · 10 min") is
  the start button: one tap lands in the start burst, with no home and no
  task set on the way.
- Test: the fresh-user walk sets a cue and the plan holds exactly one message
  for it.
- Status: not started

### 4. Anything in the way?
- Do: one row under the battery on the energy step: Skip, Boring, Scary,
  Confusing, Too big. Sent with the task call; Too big leads to the bites.
  Skip is the same as never being asked. Not shown when the task is already screened serious or
  the day holds something heavy.
- Status: not started

### 5. Bites on request
- Do: an icon button in the dock opens "Molar, in three bites · Each one
  under five minutes", each row with its minutes and a tick, the same ticks
  as the notification's, and a note under them ("Start with the first
  one.", "1 down. Tick the next when it's done.", "Opening the catch…"). The last tick opens the catch. Absent on
  a serious task and when the pack has no bites.
- Done when: registry files and sheets for each new state, both languages,
  largest text, keyboard open, offline; the fresh-user walk extended.
- Status: not started

## Risks

- The dock at the largest text size with three chips: wrap to a second row
  before truncating.
