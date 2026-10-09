# Phase 07: Scootch every day on the widgets

Status: built, not yet seen on a device · Tasks: 2 · Needs: — · Branch kind: native batch
Owns: `apps/mobile/targets/` (the widget extension's views),
`apps/mobile/src/features/surfaces/surface-snapshot.ts`,
`apps/mobile/src/features/surfaces/world-image.ts`

Board: section 08, one screen (small and medium).

Goal: Scootch is on the Home Screen on a day with nothing waiting. Lands only
in the next native batch branch.

### 1. The snapshot
- Do: when no lurker waits, the snapshot carries Scootch asleep beside the
  newest world piece and one offline line: small "Nothing waiting.", medium
  adds what joined the world last ("Molar moved in."). A crisis day carries plain
  company and no line.
- Test: the snapshot for no task, done for today, crisis.
- Status: done — 8ad1699, and 060dbf6 hands the newest piece to the snapshot. The two lines
  are the helpers' `widgetRest` and `widgetJoined`, the one source of the widget's words

### 2. The views
- Do: small and medium widgets draw that state; a tap opens the world, not
  the composer. Checked on the Mac by the Swift type-check and the binary that
  draws widget views to PNG, then on a device after the batch's build.
- Status: done — cf7ff5a; type-checked and drawn on the Mac, not yet on a device. The
  commit after 060dbf6 draws the sleep marks in the widget's own ink, so they read on a dark
  page: the rest picture is painted without them
