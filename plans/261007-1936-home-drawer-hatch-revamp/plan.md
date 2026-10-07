# Home, drawer and hatch revamp

Status: planned, not started · Created 7 Oct 2026 · Source: founder's notes, 7 Oct 2026.

Four phases, one pull request each. Phases 1 to 3 are JavaScript-only (gesture
handler and Reanimated are already in the build). Lane 4 changes the task-call
contract across the API, the domain package and the phone.

## Phases

| # | Phase | Effort | Needs | Status |
|---|---|---|---|---|
| 01 | [Home and the task set](phase-01-home-and-task-set.md) | high (cross-feature state) | — | not started |
| 02 | [Drawer and the sheet](phase-02-drawer-and-sheet.md) | medium | — | not started |
| 03 | [The hatch egg](phase-03-hatch-egg.md) | medium | — | not started |
| 04 | [Pick for me, spoken](phase-04-spoken-pick-for-me.md) | high (contract) | 01 merged | not started |

Built in order, one branch and pull request each. 04 follows 01 because 01
removes the chip and 04 adds the spoken way in.

## What changes in the product brief

The founder's notes replace these designed behaviours; the brief is updated in
lane 01's pull request so it stays the source of truth.

| Brief today | After |
|---|---|
| Section 3, "Energy and bargaining": an excuse makes the ask smaller ("Not now") | "Not now" and the counter-offer are gone. "Too big" at the hatch is the one way to a smaller ask |
| "That's it for today" rests the day from a set task | Gone, with "Changed my mind". The discard button is the way off a set task |
| "One more" under the world row on a finished day | Gone. The composer is always on home; a new thing is simply said or typed |
| Section 7: paid things are quiet locked controls where they live | Unchanged in spirit: at the daily limit the talk capsule is the locked control, and the sheet opens only on its tap. Never on a heavy day, never for Plus (a spent control) |

## Acceptance

- Home is one state for a fresh morning and a finished day: Scootch, his line,
  the world card, the composer dock. Holding or typing fades the card out and
  changes Scootch and the content in place; letting go brings them back.
- At the daily limit the keyboard switch is off and the capsule leads to the
  Plus sheet (free, not a heavy day) or is spent (Plus, heavy day).
- No "One more", "Pick for me", "Not now" or "That's it for today" control
  exists. A discard icon button sits left of Start.
- The drawer opens under a pull indicator that follows the finger; rows swipe
  to remove, tap or hold to edit, tick to clear. The sheet drags, rubber-bands
  and dismisses by velocity, with a fading shade.
- The egg reads as a hatch, not a wait: lively while the name is on its way,
  under half a second from arrival to the monster, with crack and burst.
- Saying or typing "pick for me" offers one thing from the drawer, online and
  offline.
- Each pull request ships design-beside-device sheets for its touched screens
  and extends the fresh-user walk. New states are logged in
  `docs/undesigned-states.md`: none of this has a board.

## Decided with the founder (7 Oct 2026)

1. The discard button sends the set task back to the drawer; a started task is
   parked whole with its monster.
2. A ticked drawer row is cleared quietly: no card, no world piece, no start used.
3. Built in one session, one branch and pull request per phase, in order.
