# Phase 04: Widgets that know what's lurking

Owns: `apps/mobile/targets/widgets` (widgets and accessories).

### 1. Lurker (small) and Lurkers (medium)
- Do: the oldest lurker pressed against the glass by its day; the lineup of
  up to four with day chips. Each monster is a button that starts ten minutes
  on it with no app launch.
- States: none lurking, one, four, a serious task set (plain words, no
  monster, no day), crisis (nothing of the day), day done.
- Status: done — see the commit that adds `apps/mobile/targets/widgets/LurkerViews.swift`. Type-checked with `swiftc` and drawn to sheets on this Mac in a Catalyst binary; not built for iOS, not seen on a phone

### 2. Shelf (small) and Terrarium (large)
- Do: the count in the worn finish; the caught monsters under glass with the
  latest catch. Neither counts down.
- States: nothing caught yet.
- Status: done — same commit. The world is drawn by the app into the App Group, by day and asleep

### 3. Lock Screen accessories and the StandBy nightlight
- Do: inline, circular and rectangular for the oldest lurker; after 22:00 in
  StandBy, tomorrow's one thing in dim red with "Hunt at 9:00" and "Pick
  another". StandBy is a Plus surface.
- Status: done — same commit. "Hunt at 9:00" sets one notification in Swift and tells the app; "Pick another" opens the app. The nightlight is two small widgets side by side, since StandBy has no full-width widget

### 4. Every appearance
- Do: Default, Dark, Clear and Tinted for each family.
- Status: done — same commit. Default, Dark and a stand-in for Clear and Tinted were drawn on this Mac; the system's own tinting has not been seen
