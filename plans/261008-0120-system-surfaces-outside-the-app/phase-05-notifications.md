# Phase 05: Notifications with a cast

Owns: `apps/mobile/src/features/notifications`,
`apps/mobile/src/state/day-notifications.ts`,
`apps/mobile/targets/notification-service`,
`apps/mobile/targets/notification-content` (new).

### 1. From the monsters
- Do: a day's line is sent in its monster's name with the monster's picture
  and Scootch's badge. Scootch itself sends the evening receipt, as a picture.
  A serious task sends plain words from Scootch. Limits, back-off and quiet
  hours are unchanged.
- Test: who sends what for each day state and attitude.
- Status: done — see the commit that adds `apps/mobile/modules/scootch-notifications`. Who sends what is tested; the sender's face needs the Communication Notifications capability on the App ID and has not been seen. The evening receipt is sent at 19:00 on a finished day with something on it, as the day's receipt with monsters' names in place of tasks' words; its plan is tested, its picture has not been seen in a notification

### 2. The long-press
- Do: a content extension showing the three bites, each a tick; "Hunt the
  next bite now", "Tomorrow at 9:00", "Turn it down for a week".
- States: no bites yet (the three actions alone), all ticked, largest text.
- Status: done — same commit. Type-checked with `swiftc` and drawn on this Mac; not seen in a notification

### 3. What a tap does
- Do: a response handler, so a tap or an action starts the session or does
  what was asked with the app closed. "Turn it down for a week" sends that
  monster's lines at Soft for seven days.
- Test: each action from a cold start.
- Status: done — same commit. The actions are answered in JavaScript when the app is launched for them; none has been pressed on a phone. The last bite begins the session, where "I'm done" opens the catch
