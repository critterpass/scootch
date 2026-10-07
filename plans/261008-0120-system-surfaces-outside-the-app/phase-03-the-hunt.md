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
- Status: todo

### 2. The Lock Screen
- Do: the race bar with Scootch running and the monster shrinking; all ten
  states with their two buttons; the caught card in the worn finish for eight
  minutes, then one line until the top of the hour.
- States: serious (plain words, no monster, no race joke), offline, the
  largest text size.
- Status: todo

### 3. The Island
- Do: compact with the ring, every compact state, minimal, expanded with the
  race, and the small layout the Watch Smart Stack shows.
- Status: todo
