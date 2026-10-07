# Phase 03: the hatch egg

Branch `feat/hatch-egg-cracks`. One task, one pull request.

## Context

- `apps/mobile/src/features/monster/hatch-figure.tsx`: the egg is a plain
  rounded blob that tilts 5 degrees every 1.22 s. It shows for as long as the
  monster's name takes to arrive (measured 1.9 s), then 1100 ms more
  (`EGG_MS`), then the monster pops in over 0.5 s. On a phone that reads as a
  stalled load of three seconds or more.
- `packages/art/src/motion/entrances.ts` holds `eggWobble` and `hatchPop`.
- `packages/sound/src/cues/hatch.ts` is the hatch cue, played by `onHatch`.

## Requirements

- The egg is drawn as an egg: the monster's own ink, a highlight, two or three
  speckles, a small shadow under it. Drawn with Skia in `@scootch/art`, seeded
  by the monster's seed when it is known.
- Waiting for the name (no fixed length): it is visibly alive from the first
  frame. It arrives with a drop and a squash, then rocks faster and harder the
  longer it waits, with a hop every second or so and the first crack showing
  by one second. Never a still frame longer than 300 ms.
- Once the monster is here: at most 450 ms from arrival to the pop. Cracks run
  across, the egg gives one hard shake, then bursts: five to seven shell
  shards fly out and fade, a short ring flashes, and the monster pops out of
  the middle of it (`hatchPop` shortened to about 0.35 s) with one haptic and
  the hatch cue on the burst frame.
- A monster already here when the screen is drawn gets the short version only:
  shake, burst, pop, about 600 ms in all. A monster already hatched this launch
  simply stands there, as today.
- All of it on the UI thread: shared values and derived Skia props, no state
  set per frame. Reduce Motion: the egg crossfades to the monster in 200 ms,
  no shake, no shards.
- The pure parts (crack progress, shake angle, shard paths at time `t`) are
  functions in `entrances.ts` beside `eggWobble`, as worklets.

## Owns

`apps/mobile/src/features/monster/hatch-figure.tsx`,
`apps/mobile/src/art/hatch-egg.tsx` (new),
`packages/art/src/motion/entrances.ts`, `packages/art/src/motion/index.ts`,
`packages/art/src/monster/egg.ts` (new, the egg's drawing commands),
`packages/sound/src/cues/hatch.ts` only if the cue must be shortened to fit,
`apps/mobile/src/screens/registry/monster-hatching.tsx`.

## Tests

None for the look. One for the timing contract in
`packages/art/src/motion/entrances.test.ts`: the burst begins within 450 ms of
arrival and the pop is settled 350 ms after.

## Proof

A device run recording of the hatch on the e2e build (the run id), with frames
at arrival, first crack, burst and settled, beside the board
`design/renders/monsters-and-keepsakes/01-the-task-becomes-a-creature--hatched.png`.
Say what the recording's own time from "That's the one" to the monster is.

## Risks

- The hatch stage also waits on the server for the name. If the wait is long
  the egg must still look meant; it must never look finished and stuck.
- Status: not started
