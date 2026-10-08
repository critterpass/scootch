# Phase 08: Every way to start

Owns: `apps/mobile/targets/widgets/_shared` (intents),
`apps/mobile/targets/widgets/*Control.swift`.

### 1. Say it, type it
- Do: App Shortcuts in both languages, "ten minutes on <a lurker>", with the
  lurkers offered by name; Siri answers with the small card and "Make it 5"
  and "Stop". The same intent is what Spotlight finds.
- Status: done — see the commit that adds `apps/mobile/targets/widgets/_shared/WaysToStart.swift`. Type-checked with `swiftc`; the phrases are only read by Xcode's own step, so the first build is their first proof. Phrases are English: Siri has no Vietnamese. Titles in Shortcuts and Spotlight stay English too, since the app's own bundle has no table for them

### 2. Press it
- Do: the control and the Action button start the oldest lurker; held while
  hunting, they park a thought.
- Status: done — same commit, from iOS 26, where a press may open the app only when it needs to. Before that the control still opens Scootch every time

### 3. Focus
- Do: a Focus filter: only work monsters, home monsters stay quiet, offer a
  hunt when the Focus starts.
- Status: written in part — same commit: the filter has the one switch, "Offer a hunt when this Focus starts". "Only work monsters" and "Home monsters stay quiet" are blocked: no thing is known to be work or home, and that has to come from the task call
