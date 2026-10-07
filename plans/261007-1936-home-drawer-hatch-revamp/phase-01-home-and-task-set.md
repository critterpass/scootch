# Phase 01: home and the task set

Branch `feat/home-composer-always`. One task, one pull request.

## Context

- `apps/mobile/src/features/one-screen/one-screen.tsx` builds every stage;
  `one-screen-stage.ts` decides which. Today `done` (world row, "One more") and
  `composer` are two stages joined by the `oneMore` flag.
- `task-set-shown.tsx` draws "Not now", "That's it for today" and the together
  links under the choices; the Start dock is in `one-screen-view.tsx`.
- Product brief sections 2, 6 and 7. No board exists for the new home.

## Requirements

### Home

- `stageOf` answers one `home` stage for `nothing_yet` and `done_for_today`
  (energy, care, session and the pick stages stay as they are). It carries
  `rested`, `startLeft`, `returning`, `note` and `waiting` (the task carried
  to tomorrow). `homeStarts` turns `startLeft`, Plus and the selling guard into
  `'open' | 'locked' | 'spent'`:
  - `open`: a start is left.
  - `locked`: none left, not Plus, and `showsSelling(day)`.
  - `spent`: none left, and Plus or a heavy day.
- Home draws Scootch and his line, then the world card, then the composer dock
  at the bottom. The warm-up ask after first launch keeps its chips and step
  dots and shows no world card.
- While the composer is listening, finishing, typing, sending or thinking, the
  world card (and the waiting-task note) fades out and the body shows what it
  shows today (heard words, the not-understood words). Idle again, the card
  fades back. Transform and opacity only; a crossfade under Reduce Motion.
- Scootch's mood on home: `asleep` with the done line on a finished day while
  idle, the composer's mood (`composerMood`) as soon as the composer is used
  and on a fresh morning.
- `locked`: the keyboard switch is drawn disabled; the capsule keeps its place,
  shows a lock and the unlock words, and a tap opens `PLUS_SHEET_ONE_MORE`.
  It does not record. `spent`: switch and capsule both disabled, with the
  existing "That's every start for today" words.
- Remove: `OneMore`, the `one_more_asked` event, `DayState.oneMore`, the
  `plus-one-more-*` registry screens, the "pick for me" chip
  (`RETURN_CHIPS` `pick`, `canPickForMe`, `composerWays`' pick branch). The
  `pick_for_me` event, `pickForMe` and the `picked_for_me` stage stay: phase 04
  reaches them by voice.

### The task set

- Remove "Not now" and bargaining end to end: `not-now.tsx`, the `bargain`
  stage, `excuse_given`, `smaller_asked`, `deal_struck`, the `bargaining` pick
  step, `counterOffer`, `askSmaller`, the `one-screen-bargaining` registry
  screen. Scootch's `bargaining` mood stays in the art package: the hatch uses it.
- Remove "That's it for today" and "Changed my mind": the `done_for_today` and
  `rest_undone` events, `restForToday`, `undoRest`, `restCanBeUndone`,
  `DayState.restUndo`. `carryToTomorrow` stays (the session's "not finished"
  uses it). The serious task's "Not today" is untouched.
- The Start dock becomes a row: a round quiet icon button (discard) on the
  left, Start filling the rest. At the largest text sizes they stack.
- Discard, by the task: `set` → `carried_task_set_aside` behaviour for any set
  task (rename the event to `task_set_aside`): its words go to the drawer and
  the screen is home again. `started` → `started_task_parked`.
- "Something else" on a carried morning goes: discard does the same thing.
  `TogetherLinks` stays under the choices.

## Owns

`apps/mobile/src/features/one-screen/**` except `stage-scroll.tsx`,
`apps/mobile/src/features/composer/**`,
`apps/mobile/src/features/plus/one-more.tsx`, `one-more.test.ts`,
`house-rules.test.ts`, `heavy-day-selling.test.ts`, `registry/**`,
`apps/mobile/src/screens/registry/{one-screen-*,plus-one-more-*,dump-pick-for-me}.tsx`,
`apps/mobile/src/state/{day-types,day-store,day-store-provider,day-refresh,rest-flow,pick-flow,pick-events,care-flow}.ts*`
and their tests, `apps/mobile/src/features/surfaces/surface-snapshot*`,
`apps/mobile/src/ui/icons.tsx` (one discard icon),
`packages/i18n/src/{en,vi}*.ts`, `packages/voice/src/offline/**`,
`e2e/fresh/04b-one-more.yaml`, `e2e/fresh/04c-rest-and-return.yaml`,
`e2e/tour/00-drawer-one-more-and-motion.yaml`,
`docs/product-brief.md`, `docs/undesigned-states.md`.

Not `stage-scroll.tsx`, `features/drawer/**` or `features/monster/**`.

## Tests

Protect the state machine and the money rule only:
`one-screen-stage.test.ts` (home's three `starts` values; a heavy day is never
`locked`; Plus is never `locked`), `house-rules.test.ts` (the sheet opens only
from the capsule's tap), `day-store.test.ts` (discard on a set and on a started
task). Delete the tests of removed behaviour; weaken none.

## Proof

Sheets: home on a fresh morning, home on a finished day, listening, typing with
the keyboard open, locked, spent, the task set with the discard button, each at
the largest text size, plus offline and a long task text. Fresh-user walk:
finish one thing, then say a second from home without leaving it.

## Risks

- `one-screen.tsx` returns early per stage and keeps the composer's hook state
  across them; home must not remount the composer between idle and recording.
- The surface snapshot (widgets) reads `oneMore`: check what it shows after.
- Status: not started
