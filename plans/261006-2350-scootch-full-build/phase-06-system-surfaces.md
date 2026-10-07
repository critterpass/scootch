# Phase 06: system surfaces

Status: built, unproven on a device: 7 partly · Tasks: 7 · Needs: 02, 04
Owns: `apps/mobile/targets/`, `apps/mobile/src/features/{notifications,live-activity,intents}`,
`packages/domain/src/back-off`

Goal: Scootch is present outside the app. Board: System Surfaces. The targets
exist as stubs from phase 01, so nothing here changes the native fingerprint.
If a task finds it must, it stops and goes into the next native batch.

iOS-specific: these device runs use `platform=ios`.

### 1. Notifications
- Do: schedule the day's lines locally from the task call's pack, at each
  attitude's limit, at the hour the user usually starts.
- States: notifications refused.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 2. Back-off and quiet hours
- Owns: `packages/domain/src/back-off/`.
- Do: each ignored day turns the volume down to silence, then one soft note a
  week; opening the app resets it with no mention; quiet hours, Sleep and
  Focus are respected.
- Test: the full back-off table from the board, as a pure function.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 3. Live Activity and Dynamic Island
- Do: the Lock Screen activity with the shrinking disc; compact, minimal and
  expanded Island; Park and "I'm stuck" without unlocking; the line at each
  attitude.
- Done when: captured on an iOS device run at all three attitudes.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 4. Phone picked up
- Do: the app cannot detect a pick-up while locked. So the Live Activity
  always carries a fresh line from the session pack, and the "you picked me
  up" show plays when Scootch is opened or its Live Activity is tapped during
  a session. No notification is sent for a pick-up. Log the difference from
  the board in `docs/undesigned-states.md`.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 5. Widgets
- Do: small, medium, large and extra large; no task, task set, running, done;
  Default, Dark, Clear and Tinted. Extra large is a Plus surface: it shows a
  locked preview until phase 08 unlocks it.
- Done when: a sheet of the whole family in every appearance.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 6. Lock Screen accessories and StandBy
- Do: inline, circular and rectangular accessories; the StandBy view (Plus).
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

### 7. Control Center and the Action button
- Do: a control and an App Intent that start a ten-minute session; hold opens
  the brain dump.
- Done when: a session starts from Control Center with the app closed.
- Status: partly done — 88a2e69; written and type-checked, never compiled into an app or run on a device

## Exit

- Sheets from an iOS device run for every surface.
- The fresh-user walk receives a scheduled notification and starts a session
  from it.
