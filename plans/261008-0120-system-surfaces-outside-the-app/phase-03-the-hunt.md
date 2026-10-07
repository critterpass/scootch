# Phase 03: The hunt

Owns: `apps/mobile/targets/widgets/SessionLiveActivity*.swift`,
`apps/mobile/targets/_shared` (the session record), `apps/mobile/src/state`
(adopting a session begun outside). High effort: Swift and the session.

### 1. A session that runs with the app closed
- Do: a Swift record of the running session in the App Group. Intents start
  it, pause it for stuck, add five minutes and end it, and move the Live
  Activity themselves. The app adopts the record when it opens and the day's
  own tables stay the truth afterwards. Stuck holds the clock here, which
  the session row does not do today (its end is its start plus its planned
  minutes): adopting a held session has to move the row's end with it.
- Test: adopting a session begun outside; one begun twice; one that ended
  while away.
- Status: done — see the commit that adds `apps/mobile/src/state/hunt-adoption.ts`. The record, the intents and the adoption are tested or type-checked here; none of it has run on a phone

### 2. The Lock Screen
- Do: the race bar with Scootch running and the monster shrinking; all ten
  states with their two buttons; the caught card in the worn finish for eight
  minutes, then one line until the top of the hour.
- States: serious (plain words, no monster, no race joke), offline, the
  largest text size.
- Status: written — same commit. Type-checked against the iOS SDK with `swiftc`; not built, not seen. Between drawings only the clock and the bar move (the system animates those); Scootch's place and the monster's size are as of the last drawing. A session started in the app keeps its caught card whole until the top of the hour, because an ended activity is not drawn again to fold it

### 3. The Island
- Do: compact with the ring, every compact state, minimal, expanded with the
  race, and the small layout the Watch Smart Stack shows.
- Status: written — same commit, with the same limits. No separate small layout for the Watch: the Smart Stack shows the compact views
