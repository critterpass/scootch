# Phase 03: Opening, viewfinder, Desk and Room

Status: built and tested off a phone; never run on a device · Tasks: 5 · Needs: 01, 02
Owns: `apps/mobile/src/features/camera/`, `apps/mobile/src/app/camera.tsx`,
`apps/mobile/src/screens/registry/camera-*.tsx`,
`apps/mobile/src/features/composer/composer-row.tsx`,
`apps/mobile/src/features/composer/composer-parts.ts`, `e2e/camera/`,
`docs/undesigned-states.md`

Goal: the two free modes, end to end, offline included. Board screens:
"Opening the camera", "Viewfinder · looking", "Desk · first step found",
"Room · pick a corner".

### 1. The camera button
- Owns: `composer-row.tsx`, `composer-parts.ts`.
- Do: a round icon button beside the capsule, the same size as the switch.
  Shown only when the reading module exists. Off, with the dock, when the
  day has no start left. Scootch's opening line comes from the opening route
  or the offline pack, once per day at most.
- Status: built — SHA3; not run on a device

### 2. The camera machine
- Owns: `apps/mobile/src/features/camera/`.
- Do: one state machine: permission, looking, reading, found, nothing found,
  too dark, refused, failed. The mode chips switch mode without leaving.
  The photo is a file in the app's temporary folder and is deleted when the
  camera closes, unless a session started from it (phase 05 keeps it until
  that session ends).
- Test: the machine; the photo is deleted on every way out.
- Status: built — SHA3; not run on a device

### 3. Viewfinder and overlays
- Owns: `apps/mobile/src/features/camera/`.
- Do: the viewfinder with Scootch peeking from the corner, the privacy chip,
  dots that settle on what was found, the "Spotted" line built from labels,
  the mode chips. Desk: one ring, everything else dimmed, "Start here".
  Room: lettered zones with the chosen one lit. Retake and "Bigger zone" as
  chips, the step as the main button.
- Status: built — SHA3; not run on a device

### 4. From step to task
- Owns: `apps/mobile/src/features/camera/`.
- Do: the main button sends the step's words through the same path as a
  typed task (care screen, the task call, the hatch), so limits, the monster
  and the session behave as for any task. Offline, it is the offline task
  path.
- Test: a step sets a task exactly as typing the same words does.
- Status: built — SHA3; not run on a device

### 5. Screens, walk and sheets
- Owns: `apps/mobile/src/screens/registry/camera-*.tsx`, `e2e/camera/`,
  `docs/undesigned-states.md`.
- Do: one registry file per board screen and per undesigned state: permission
  primer, permission refused (a way to Settings), nothing found, too dark,
  offline, largest text. Log each undesigned state. Extend the fresh-user
  walk: open the camera, allow, photograph, start. Dispatch the device run
  and report its id.
- Done when: sheets for every screen above in both languages.
- Status: built — SHA3; not run on a device

## Risks

- A device run has no camera (plan question 1). Until answered, the walk
  stops at the permission prompt and the sheets come from the registry.
