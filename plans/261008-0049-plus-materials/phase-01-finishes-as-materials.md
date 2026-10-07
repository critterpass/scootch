# Phase 01: Finishes as materials

Owns: `packages/domain/src/contracts/art.ts`, `packages/art/src/{core,backends,card}`,
`apps/mobile/src/art/skia-*`, every fixture that names a finish.

### 1. The seven finishes in the contract
- Do: `paper`, `holo`, `chrome`, `jelly`, `glass`, `flock`, `riso`. The four
  names that are gone are read as their nearest finish wherever a card is
  parsed (stored rows, a backup, an older app's share request).
- Test: the contract's own test file.
- Status: todo

### 2. A fill of light in the drawing model
- Do: one new command, `paint`: a path filled with a linear gradient, a round
  gradient or grain, in a blend mode. All three backends replay it.
- Test: each backend's test file.
- Status: todo

### 3. Each finish as data
- Do: one file per finish for its material (stock, sheen, sparkle, grain,
  text inks, glow) beside its inks for the caught card; a builder that lays a
  material on any box at any tilt.
- Test: every finish builds, and the tilt moves the sheen without changing the
  number of commands.
- Status: todo

## Risks

- Skia cannot be run on this Mac. The new command uses only gradient, blend
  and noise nodes; the first device run is the proof.
