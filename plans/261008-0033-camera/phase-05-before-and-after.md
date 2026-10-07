# Phase 05: Before and after

Status: built and tested off a phone; never run on a device · Tasks: 4 · Needs: 03
Owns: `apps/mobile/src/features/camera/` (after),
`apps/mobile/src/features/session/screens/after-screens.tsx`,
`apps/mobile/src/features/share/`,
`apps/mobile/src/screens/registry/camera-*.tsx`, `docs/undesigned-states.md`

Goal: proof you can feel. Board screen: "Before and after".

### 1. Keeping the first photo
- Do: a session started from Desk or Room keeps its photo on the phone, tied
  to that session, in the app's own folder. It is deleted when the session
  ends without a second photo, when the user declines, and after a day in
  any case.
- Test: every ending deletes the photo unless Keep or Share was tapped.
- Status: built — SHA5; not run on a device

### 2. Asking for the second photo
- Do: after a caught session that began with a photo, a pill on home offers
  one more, with a plain way to skip. Never after a session that was not
  finished, never on a serious task, never from Paper or Screen.
- Status: built — SHA5; not run on a device

### 3. The card
- Do: the two photos under one drag handle, "Before" and "After · n min",
  the title, Scootch's line from the after route, and the figures the phone
  can count: minutes, things gone, zones cleared. A figure that is zero is
  not shown.
- Test: the figures from two fixed sets of recognised things.
- Status: built — SHA5; not run on a device

### 4. Keep, share and sheets
- Do: "Keep private" saves one picture of the card to the person's own
  photos. "Share the glow-up" renders the card as one image carrying
  scootch.app and opens the share sheet through the existing share flow; the
  photos are never uploaded. Neither button, nothing is kept. Registry files
  and sheets: the card, dragging, one figure only, skipped, largest text.
- Done when: sheets in both languages.
- Status: built — SHA5; not run on a device

## Risks

- Counting "things gone" compares two photos taken from different spots.
  Count only a thing that was ringed or clearly present before and is absent
  after; when unsure, show minutes alone.
