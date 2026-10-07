# Phase 01: What the surfaces are told

Owns: `packages/domain/src/hunt`, `apps/mobile/src/features/surfaces`,
`apps/mobile/targets/_shared`. High effort: a contract two languages read.

Everything a surface shows is written by the app into the App Group ahead of
time, with the care rules already applied, so Swift never decides what is
safe to show.

### 1. The hunt's states
- Do: one pure function from a session and a time to what the Live Activity
  shows: starting, running, thought parked, stuck, last two minutes, overtime,
  caught, caught collapsed, stopped early. Offline and "at a table" are flags
  beside the state. The race's place and the monster's size come from it.
- Test: every state and each edge between them, as a table.
- Status: done — see the commit that adds `packages/domain/src/hunt`

### 2. Lurkers
- Do: the hatched things that are waiting, oldest first, at most four: name,
  the task's words, days waited, drawn size for the day, picture. A serious
  task is never in it. A crisis day has none.
- Test: who lurks, the order, the day count across midnight, the size steps.
- Status: done — see the commit that adds `packages/domain/src/hunt`

### 3. The snapshot, second version
- Do: the snapshot gains the lurkers, the hunt (its times, pause, parked
  receipt) under its own key, each task's lines by state, the look that is worn (finish and the
  ink's colours), the shelf count, the latest catch and the bites. The Swift
  mirror follows field for field.
- Test: the built snapshot for each day state; a fixture both languages decode.
- Status: done — see the commit that adds `packages/domain/src/hunt`; the same fixture and the same hunt cases were run through the shared Swift with `swiftc` on this Mac, not in an iOS build

### 4. Asked for while away
- Do: the actions gain hunt-a-lurker, cancel the count-in, finish, five more,
  first line, make it smaller, tick a bite, tomorrow at nine, keep it here,
  turn it down for a week. Each carries the task it is about.
- Test: taken once, in order, the stale ones dropped.
- Status: done — see the commit that adds `packages/domain/src/hunt`. The app acts on the four it already knew; each new one is acted on by the phase that draws its button
