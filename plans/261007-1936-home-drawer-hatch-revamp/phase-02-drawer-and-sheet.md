# Phase 02: the drawer and the sheet

Branch `feat/drawer-gestures-and-sheet`. One task, one pull request.

## Context

- `apps/mobile/src/features/drawer/drawer-sheet.tsx` is a React Native `Modal`
  with the system slide: no drag, no shade fade, a text "Close the drawer".
- `apps/mobile/src/features/one-screen/stage-scroll.tsx` opens the drawer when
  a pull of 90 points ends; nothing shows while pulling.
- `react-native-gesture-handler` and Reanimated are in the build and
  `GestureHandlerRootView` wraps the app (`src/app/_layout.tsx`).
  `features/reveal/ui/handled-card.tsx` is the house example of a pan gesture.
- Board: `design/renders/scootch/03-brain-dump--peek-in-the-drawer.png`. The
  gestures, the row actions and the pull indicator have no board.

## Requirements

### A sheet of our own: `apps/mobile/src/ui/sheet/`

- `Sheet`: a floating card over a shade, drawn in the screen (no `Modal`), so
  it can follow a finger. Props: `open`, `onClose`, `children`, `testID`,
  an optional `maxHeight`.
- Opens with a spring from below; the shade's opacity follows the sheet's
  position. Drag from the grabber or the header moves it; dragging the list
  moves it only when the list is at its top. Released past a third of its
  height or faster than a flick, it closes; otherwise it springs back. Pulled
  up past rest it rubber-bands. A tap on the shade closes it.
- Layout from the board: 8 point margins, 44 point corners, grabber, a header
  slot and a scrolling body that never runs under the home indicator, and that
  lifts above the keyboard when a row is being edited.
- Reduce Motion: fade only. VoiceOver: modal, with an escape gesture and a
  close button reachable in the header.
- The drawer is its first user. Do not move the Plus sheet in this lane.

### The pull

- `StageScroll` reports the pull distance as it happens (a shared value, no
  re-renders). A `PullHint` at the top of the screen follows it: the drawer's
  handle slides down from the top edge and stretches with the pull, with one
  haptic tick and a small snap when the distance is enough to open; letting go
  after the snap opens the drawer, before it the handle springs away.
- Reduce Motion: the handle fades in and out, no stretch.

### Rows

- Swipe left to remove: the row follows the finger over a tomato lane with a
  bin; past halfway, or a flick, it leaves and the rows below close up. A short
  "Put it back" toast undoes it for a few seconds.
- Tap, or hold, the words to edit them in place: the row becomes a field with
  the keyboard; return saves, an empty field or a tap outside leaves it as it
  was. Editing counts as mentioning it again (the fade moves on two weeks).
- The ring on the left is a tick box: tapped, it fills, the words strike
  through and the row leaves after a beat. Dated rows keep their tomato mark
  and get the same tick.
  A tick removes the item exactly as a swipe does (founder, 7 Oct).
- "Swap in" stays where it is. Every gesture has a VoiceOver custom action
  (remove, edit, done).
- New day events `drawer_item_removed`, `drawer_item_edited`,
  `drawer_item_restored` (the undo), and `drawer_item_done` if the decision
  makes it differ from removal. A removed item that is a task parked whole
  (same id in `tasks`) also forgets that task and its monster.
- Domain: `editItem(item, text, today)` in
  `packages/domain/src/drawer/drawer-items.ts`, beside `mentionAgain`.

## Owns

`apps/mobile/src/ui/sheet/**` (new), `apps/mobile/src/features/drawer/**`,
`apps/mobile/src/features/one-screen/stage-scroll.tsx`,
`apps/mobile/src/state/drawer-flow.ts` (new) and its test,
`packages/domain/src/drawer/**`,
`apps/mobile/src/screens/registry/drawer-*.tsx`,
`e2e/tour/04-drawer-world-keep.yaml`, `e2e/tour-support/shot-drawer.yaml`.

Shared with phase 01, additions only: the three or four new members of
`DayEvent` in `apps/mobile/src/state/day-types.ts`, their `case` lines in
`day-store.ts`, new `drawer.*` keys in `packages/i18n/src/{en,vi}.ts`, and one
bin icon in `apps/mobile/src/ui/icons.tsx`. Touch nothing else in those files.

## Tests

`drawer-flow.test.ts`: remove, undo, edit (fade date moves, a dated item keeps
its return day), removing a task parked whole forgets its monster.
`packages/domain/src/drawer/drawer.test.ts`: `editItem`.

## Proof

Sheets: empty, three, twelve, a row half swiped, a row being edited with the
keyboard open, a ticked row, the pull hint mid-pull, the largest text size, a
very long item. Fresh-user walk: park two things by rambling, pull the drawer
open, edit one, remove one, undo, tick one.

## Risks

- The list's scroll and the sheet's drag share one finger: use gesture
  handler's simultaneous and native-gesture wiring, not two responders.
- A sheet drawn in the screen sits under any pushed route; the drawer only
  opens on the one screen, which is the case today.
- Status: not started
