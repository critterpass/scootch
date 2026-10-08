# Phase 09: Share into a monster

Owns: `apps/mobile/targets/share` (new), `apps/mobile/src/state` (taking in
what was shared). High effort: the care screen.

### 1. The sheet
- Do: a share extension for text, links and pictures. The extension shows
  the words it took and two choices, "Hunt it now" and "Let it lurk till
  tomorrow", and hands them to the app through the App Group.
- States: nothing readable was shared.
- Status: done — see the commit that adds `apps/mobile/targets/share`. Type-checked with `swiftc`; not built, not seen. A picture is read on the phone with Vision. A share sheet cannot open its app, so "Hunt it now" keeps the thing and says to open Scootch

### 2. The monster
- Do: the name, size and joke appear only once the task has been screened,
  which is the task call. Until then, and offline, the sheet says the plain
  words. A serious thing gets no monster.
- Test: screened, serious, crisis, offline.
- Status: done in the app, not on the sheet — same commit. The sheet always says the plain words; the thing is screened when Scootch takes it in, and the monster hatches there. Taking in is tested: free day, a day with its thing, tomorrow, crisis words. The sheet showing the monster would need the task call made from the extension
