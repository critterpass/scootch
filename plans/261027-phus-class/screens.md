# Screens: routes, owners and hand-offs

How the phone screens are split between lanes so they never edit the same
file. Boards are in `design/phus-class/` (the phone prototype is
`App.dc.html`; most phone boards are it with props).

## Routes (Expo Router, `apps/mobile/src/app/`)

| Route | What | Owner |
|---|---|---|
| `_layout.tsx` | Providers (database, i18n, board store, gesture handler, safe area), fonts, the first-day redirect | foundation; the first-day lane adds only the redirect |
| `index.tsx` | The desk: the classroom at the desk shot, his line, the task card and Start with the fuse, "Say it", the chalkboard behind him, recess, late slip, empty desk, offline pill | desk lane |
| `session.tsx` | A running period: the camera pulled back, his pacing, raise a hand, a stray thought, the drum, Done / Not yet, partial credit, the finish (red check, comment, confetti), "Next." or recess | desk lane |
| `board.tsx` | The board, grown out of the chalkboard: his order, swap, reword, tick, erase, "Still yours?" | board lane |
| `logbook.tsx` | The logbook page, lowered from the top of the board | board lane |
| `first-day/*` | The four first-day beats, as one stack | first-day lane |
| `settings.tsx`, `settings/*` | Settings, export, delete everything, language, notes home, quiet hours | first-day lane |
| `care/*` | Serious mode panel, crisis screen, helplines | first-day lane |
| `timetable.tsx` | The timetable sheet, swiped up from the desk | tuition lane |
| `tuition/*`, `report-card.tsx` | The receipt, trial card, PAID, pending, failed, scholarship, report card | tuition lane |
| `share/*` | The four share formats | sharing lane |
| `(dev)/*` | Developer tools, the classroom gallery, the screen registry | each lane adds its own registry entries as new files |

## Hand-offs between lanes

- **Desk to board.**
  - The desk lane owns the pull-down gesture on the desk. Past the threshold, or on a tap of the chalkboard, it calls `router.push('/board')` with the gesture's progress handed over as a shared value through `src/ui/motion/hand-off.ts`. The desk lane creates that file.
  - The board lane owns the grow animation inside `board.tsx`. It starts from the chalkboard's frame, which the desk lane publishes in the same hand-off module.
- **Board to logbook:** within the board lane.
- **Desk to timetable.**
  - The desk lane owns the swipe-up gesture on the desk sheet. It calls `router.push('/timetable')` the same way, and keeps the desk's task card frame in the hand-off module for the shared-element move.
  - Until the tuition lane lands, `/timetable` is a stub screen that the desk lane may create; the tuition lane replaces it.
- **Desk to session:** within the desk lane.
- **First day:** `_layout.tsx` redirects to `/first-day` when the store says the first day is not done. The first-day lane ends by marking it done and `router.replace('/')`.
- **Care:** the board store raises the crisis state. Every screen that shows tasks checks `useBoard().care` and, on crisis, replaces itself with `/care/crisis`. The first-day lane owns that screen and a `useCareGuard()` hook in `src/features/care/`. The desk and board lanes call the hook.
- **Tuition gates:** a locked control calls `router.push('/tuition')`. The tuition lane owns what opens.

## Shared rules for every screen

- His lines come from `@phusclass/voice/class` through the chooser. Interface words come from `@phusclass/i18n`. Nothing he says is hard-coded.
- The classroom is `@/classroom` `<Classroom>`. Its camera shots are `desk`, `session`, `recess` and `firstDay` in the `phone` framing.
- Motion: the interface curve `cubic-bezier(.32,.72,0,1)`, the character curve `(.34,1.56,.64,1)`, the camera curve `(.7,0,.2,1)`. Reduce Motion cuts.
- Glass: iOS 27 Liquid Glass through `expo-glass-effect` where the boards draw glass, with solid fallbacks.
- Every gesture has a tap alternative. VoiceOver labels on every control. Largest text sizes must not clip.
- Every screen state gets a registry entry for the design-beside-device sheets (`(dev)/registry`, one file each).
