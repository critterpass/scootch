# Phase 05: keeping

Status: see the audit note below · Tasks: 8 · Needs: 02, 04

> Audit 7 Oct 2026: the app does post cards and stories for sharing (the "not started" line on the app side is stale), never walked. Not built: the week's name and cover text (nothing writes it), wearing a surprise drop, the record as a video.
Owns: `apps/mobile/src/features/{world,zoo,record,share}`,
`packages/domain/src/rarity`

Goal: finishing leaves something permanent and worth showing. Boards: App flows
(Hold to finish and rewards); Monsters and Keepsakes; Plus section 01 for the
free and Plus states.

### 1. Rarity and stats
- Owns: `packages/domain/src/rarity/`.
- Do: days lurked, catch time, "dread" and rarity computed from the task's
  real history. Never random, never purchasable.
- Test: the same history always gives the same rarity.
- Status: partly done — ccdb754; pure logic and tests in packages/domain, no screens, storage or store SDK yet

### 2. The reveal
- Do: after finishing, the card flip, the world piece landing, the bar of
  music, then the treat handed over with ceremony, in that order, skippable.
- States: Reduce Motion; a serious task gets none of it.
- Status: partly done — b47f3d1; built and tested with fakes, not yet run on a device

### 3. The world
- Do: every finished thing adds a permanent piece; day zero, one piece and
  three hundred pieces all look intended. A task the user let go leaves no
  trace.
- Done when: sheets at 0, 1, 7, 60 and 300 pieces.
- Status: partly done — b47f3d1; built and tested with fakes, not yet run on a device

### 4. The zoo
- Do: every caught monster, always visible; tap for its card.
- States: empty zoo.
- Status: partly done — b47f3d1; built and tested with fakes, not yet run on a device

### 5. The record
- Do: each finished day adds a bar and an instrument; Sunday playback with
  the needle drop; liner notes crediting each instrument to its day and task;
  the week's name and a cover printed from that week's monsters; a week with
  fewer than seven bars is a smaller band.
- States: first week, one bar.
- Status: partly done — b47f3d1; built and tested with fakes, not yet run on a device

### 6. Share
- Do: the share story (what you did, how long it waited) at 4:5 and 9:16,
  with a line the user can edit; the caught card; the "now playing" record
  story with its clip. Each carries scootch.app. A toggle
  hides the task line. Scootch never offers to share a task flagged private or
  serious.
- Test: a serious task has no share path.
- Status: partly done — b47f3d1; built and tested with fakes, not yet run on a device; a page is now made only from words the server signed: the phone stores the task call's signature with the monster (a new local column) and sends it with the share, the server no longer screens its own name, title and card line (which the live screen refused, so a story or a hidden-task card could never be shared) and still screens a task line left showing; a monster with no signature shares its picture with no link and the panel says so; tested with fakes and, for the server, run locally with the real models, not deployed, never seen on a device

### 7. Shared pages, app side
- Do: upload the card or clip and return its page link, using the phase 03
  API. The page itself is phase 10.
- Done when: a shared link opens a placeholder page with the right image.
- Status: not started — the app shares files through the system sheet only; nothing is uploaded

### 8. Surprise drops
- Do: now and then a finish also gives something rare (an outfit, an odd
  object), with "Wear it" or "Later". Earned only, on no fixed schedule,
  never purchasable, and never after a serious task.
- Test: the drop rule is a pure function of the user's history and a seed, so
  a run can be replayed; nothing in the shop can produce a drop.
- Status: partly done — ccdb754; pure logic and tests in packages/domain, no screens, storage or store SDK yet

## Exit

- Sheets for each state above.
- The fresh-user walk ends day one with a card in the zoo and a piece in the world.
