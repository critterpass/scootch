# Phase 05: Waiting mode

Status: done · Tasks: 3 · Needs: 02, 03
Owns: `apps/mobile/src/features/dump/` (a heard-time panel),
`apps/mobile/src/features/one-screen/minutes-control.tsx`,
`apps/mobile/src/screens/registry/dump-time-heard.tsx`,
`apps/mobile/src/screens/registry/one-screen-task-set-before-a-time.tsx`,
`docs/undesigned-states.md`

Board: section 05, three screens.

Goal: a thing at three stops eating the morning. Only a time the user said;
no Calendar.

### 1. Time heard
- Do: after the ramble, on the one-thing panel, Scootch says the time back
  ("Dentist at 3. I'll end sessions in time for you to get ready, and nudge
  you once.") with two chips, Good and "Don't watch it". The day stores it;
  "Don't watch it" keeps the time unwatched: no capped length, no nudge. The one thing offered is one whose ten-minute fit or
  bites fit the gap; when nothing fits, Scootch keeps plain company and
  offers nothing.
- Status: done — 1e26523

### 2. A length that ends in time
- Do: with a heard time today, the wheel opens at the longest length that
  ends before the get-ready time, and the line reads "Ends at 1:40, then you
  get ready".
  The user can still turn it past; nothing blocks.
- Test: the wheel's opening value for gaps of 8, 45 and 240 minutes.
- Status: done — 1e26523

### 3. The get-ready nudge
- Do: one notification at the get-ready time, from Scootch and not a
  monster ("Dentist at 3. Time to get ready."), through the plan from phase
  01. A running session shows it on the Live Activity line instead. Never a
  second one, never "leave now".
- Done when: sheets both languages; the fresh-user walk types a time and
  sees the capped length.
- Status: done — 1e26523

## Risks

- Travel time is unknown without Location. The lead is 35 minutes unless
  changed in Settings, not learned;
  the copy says "get ready", never "leave".
