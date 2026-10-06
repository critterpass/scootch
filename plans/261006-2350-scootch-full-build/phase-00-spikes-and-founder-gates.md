# Phase 00: spikes and founder gates

Status: not started · Tasks: 9 · Needs: nothing

Goal: remove the unknowns that would change the plan, and get the accounts and
designs in place. Every spike is one lane, ten to fifteen minutes, three to
five samples, and a verdict of a few lines in `plans/reports/`. A spike writes
no product code.

## Spikes

### 1. Voice bake-off
- Do: write the voice guide draft in English and in Vietnamese (rules, ten
  good and ten banned lines per attitude, the banned-word list). Run five
  tasks through each candidate model at three attitudes, in both languages.
  Vietnamese lines are written in Vietnamese, never translated.
- Verdict: which model for each language, cost per task for the
  one-call-per-task shape, latency.
- Output: a page of sample lines the founder can read. Feeds the Voice gate.

### 2. Phone picked up
- Do: find what can trigger the "phone picked up" show: unlock notification,
  app foregrounding, a Live Activity push. Test on a real phone if possible.
- Verdict: fires when locked, only on unlock, or not at all; the nearest honest
  behaviour.

### 3. On-device care screen
- Do: try a bundled small classifier and a keyword pass on twenty rambles
  (ten heavy, ten not) in each language, with no network. Compare with Jev on the same set.
- Verdict: what runs on the phone, and the threshold where Jev takes over.

### 4. Baked poses
- Do: render three Scootch poses and one monster with Skia, export to images,
  show them in a widget and a Live Activity.
- Verdict: the export path and the image sizes.

### 5. Table on a Durable Object
- Do: four WebSocket clients, one shared timer, a nudge, one dropped and
  resumed connection.
- Verdict: works or not, and the message shape.

### 6. iCloud token
- Do: write a token to iCloud key-value storage, reinstall, read it back; read
  it from a second device on the same Apple ID if one is at hand.
- Verdict: reliable or not, and the fallback when iCloud is off.

## Design

### 7. Export the boards
- Status: partly done, 6 Oct 2026. Nine boards are in `design/` as HTML
  (Camera, Care and Edge States, Characters, Growth, iPhone Duo, Monsters and
  Keepsakes, Plus, System Surfaces, Tables). "App flows" and "Website" are
  still over the export limit. No renders or `screens.json` yet.
- Do: once the founder has split the last two boards, export every board to
  `design/<board>.dc.html` and one PNG per screen to `design/renders/`.
  Write `design/screens.json` (board, screen label, render path).
- Done when: every screen named in the product brief has a render, or is
  listed as missing.

### 8. Review the unseen part
- Status: partly done, 6 Oct 2026. Session, finish, rewards, not finished,
  coming back, the world, the record, sharing and tables are reviewed, and
  their findings are in product-brief section 11 and the phase files.
- Do: review "Settings and icon" on App flows and Website sections 03 to 15
  against the product brief and this plan. List conflicts and gaps.
- Done when: the plan's unresolved question 4 is closed, with any plan edits
  made.

## Founder

### 9. Founder gates
The items in plan.md. For each, the phase report gives the exact steps
and what to send back. Nothing here blocks spikes 1 to 6.

## Exit

- Six verdicts written, each under twenty lines.
- The Voice gate passed.
- Any spike that failed has changed the product brief's section 11 and the
  affected phase file.
