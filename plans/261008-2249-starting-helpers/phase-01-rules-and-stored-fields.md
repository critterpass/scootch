# Phase 01: Rules and stored fields

Status: not started · Tasks: 7 · Needs: — · Effort: high (cross-package contracts)
Owns: `packages/domain/src/contracts/local-db.ts`,
`packages/domain/src/contracts/ai-task-call.ts`,
`packages/domain/src/rarity/card-stats.ts`, `packages/domain/src/session/`,
`packages/domain/src/hunt/`, `packages/domain/src/back-off/notification-plan.ts`,
`packages/domain/src/day/`, `apps/mobile/src/db/`, `apps/mobile/src/data/repositories/`, `design/README.md`,
`design/screens.json`, `docs/product-brief.md`

Goal: every rule and number of the helpers, as pure code with tests, before
any screen. Read `docs/tech-decisions.md`: the local database and contracts sections.

### 0. The board in the repository
- Do: `design/Scootch - Starting Helpers.dc.html` is already copied in. Render
  it with `tools/scripts/render-design-screens.ts`, add its rows to
  `design/screens.json` and its line to `design/README.md`, noting the treat
  row and length pills it draws are not the app's.
- Status: not started

### 1. Stored fields
- Do: optional, nullable fields, so older rows and backups read unchanged.
  Task: `guessMinutes` (one of 30, 60, 120, 180, 360: the sheet's five
  steps), `startCue` (a day moment of coffee, lunch, work, dinner, bed, or a
  clock time; absent means now), `inTheWay` (`boring`, `scary`, `confusing`,
  `too_big`), `nextStart` (one line of task text, with the day it was
  written). Monster: `guessMinutes` and `oddWord` ("tiny"), frozen at the
  catch. Day: `heardTime` (a clock time, the user's words, and `watched`,
  false after "Don't watch it"). Settings: the fixed hour of each day moment,
  the get-ready lead (35 minutes), and "others hunting" on or off. Local migration.
- Test: a row and a backup written before the fields still parse; let go
  still deletes everything.
- Status: done — 78b57dc

### 2. Guess and real
- Do: `CardStats` carries the guess beside `catchMinutes`. A function gives
  the pair to print, or nothing when no guess was made. No verdict, ratio or
  comparison word is computed.
- Test: guess absent, shorter, equal and longer than real.
- Status: done — c600852

### 3. End time and the gap
- Do: the end time of a length from now, in the user's local clock; with a
  cue set, "Back after lunch, around 1:10" from the moment's hour. For a
  heard time: the get-ready time (the lead from settings), the longest
  length that ends before it, and whether a thing fits at all.
- Test: across midnight, across the day's rollover hour, a gap under five
  minutes (no length offered), a heard time already past (ignored).
- Status: done — b1a9ebb

### 4. The cue in the notification plan
- Do: a cue or a get-ready nudge takes one of the day's notifications, at its
  own time, inside the attitude's limit, spacing, quiet hours and back-off. It
  never adds a message. A serious task's cue is plain and unsigned by a monster.
- Test: Soft with a cue sends exactly one; a cue inside quiet hours moves to
  their end or is dropped; a silent back-off day sends none.
- Status: done — a35a91f

### 5. Next time, and the first bite
- Do: a stored `nextStart` is the first bite of the next sitting in place of
  the written one, and is cleared at the catch, at let go and when the task
  is made smaller. Session state carries it to the opening line.
- Test: carried to tomorrow keeps it; made smaller clears it; a serious task
  keeps the line and shows it plain.
- Status: done — 7d632f0

### 6. The brief
- Do: once the rest of this phase has merged, add the helpers to
  `docs/product-brief.md`: the day loop (section 3: in the way, guess, ends
  at, when, a time heard, next time), what you keep (section 5: the guess
  line on a card, odd weeks, bites on request), and the board's two outdated
  drawings in section 11. Founder approved, 8 Oct 2026.
- Status: done — with this change
