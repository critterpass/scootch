# Phase 02: characters and sound

Status: built, unproven on a device: 1 done, 5 partly · Tasks: 8 · Needs: 01 · Owns: `packages/art`, `packages/sound`

Goal: Scootch, every monster and every sound exist as components other lanes
drop in. Board: Characters; the card on App flows.

### 1. Scootch
- Status: partly done — 79d90b5; stills for every mood, no animation, squeak or Skia backend yet; Skia renderer and idle in the app — 93448c2, unverified on a device; motion loops built — fd6174c, not yet seen on a device
- Do: the critter in Skia with its moods (waiting, listening, typing,
  bargaining, pleased, asleep, serious) and the squeak on tap. Reduce Motion
  form for each.
- Done when: every mood renders in the registry sheet beside its render.

### 2. Work modes
- Status: partly done — e02ea2a; stills for thirty modes, no loops yet; motion loops built — fd6174c, not yet seen on a device
- Owns: `packages/art/src/work-modes/` (one file per mode).
- Do: all 30 modes, each with prop, accessory and loop.
- Done when: the 30 appear in a sheet; a missing mode falls back to a plain
  working loop, never a blank.

### 3. Monster generator
- Status: done — a6f6d3b
- Owns: `packages/art/src/monsters/` (one file per body).
- Do: 20 bodies; parameters for ink, size, eyes, mouth, horns, antennae and
  legs; a pure function from a seed and parameters to a drawing. The same
  function must run on the web for the monster maker.
- Test: the same seed always draws the same monster; no two of 200 random
  seeds are identical.
- Done when: the zoo sheet matches the board.

### 4. Shrinking
- Status: motion loops built — fd6174c, not yet seen on a device
- Do: the monster visibly shrinks with each "too big", and reacts.
- Done when: three shrink steps are captured.

### 5. Card
- Do: the collectible card with stats, rarity, flavour text and the tilt foil;
  the finishes Standard, Kraft, Gold, Night and Riso; export to a PNG at 4:5
  and 9:16 for sharing and link previews.
- Done when: an exported card matches the board at both sizes.
- Status: partly done — 544f931; stills and exports, no reveal animation or Skia text yet

### 6. Pose baker
- Owns: `packages/art/src/bake/`.
- Do: export Scootch's poses and a monster to images for the Swift targets and
  for the website, following the phase 00 verdict.
- Done when: a baked pose shows in the widget stub.

### 7. Sound and haptics cues
- Status: partly done — 0057445; composed and measured, not yet heard by the founder or played in the app
- Owns: `packages/sound/src/cues/`.
- Do: a named cue list (start burst, hatch, shrink, park, two minutes left,
  hold rising, finish, quiet finish for serious mode, nudge) with matching
  haptics. Each cue respects the sound and haptics switches.
- Done when: every cue plays from a lab screen on a device.

### 8. The record
- Status: partly done — 0057445; composed and measured, not yet heard by the founder or played in the app
- Do: one bar of music from a finished day (seeded by the day's monster); a
  full track from up to seven bars; a 15-second clip export; a record with
  fewer than seven bars still sounds finished.
- Test: the same week always composes the same track.
- Done when: the founder approves three sample weeks by ear.

## Exit

- Sheets for all moods, 30 modes, 20 bodies and the card.
- Phase 04 swaps its placeholders for these components with no interface change.
