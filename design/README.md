# Designs

The designs live in Claude Design, project
`458d4c8c-ff01-4813-8bcc-9c7e9a1f821b`
(https://claude.ai/design/p/458d4c8c-ff01-4813-8bcc-9c7e9a1f821b).

## Boards (as of 6 Oct 2026, 23:59)

| Board | Covers | In this folder |
|---|---|---|
| Scootch (App flows) | First launch, the one screen, brain dump, session, hold to finish and rewards, not finished and coming back, settings and icon | No: over the export limit |
| Monsters and Keepsakes | The monster, the world, the week's song, share cards and stories, the binder | Yes |
| Tables | Lobby, waiting alone, invite, full table, nudges, labels | Yes |
| Characters | 30 work modes, 20 monster bodies | Yes |
| System Surfaces | Live Activities, widgets, controls, notifications | Yes |
| Plus | Locked controls, the sheet, trial and renewal, friends, gifts, lifetime, shelf, manage | Yes |
| Care and Edge States | Serious mode, crisis, offline, AI unavailable, accessibility, privacy, seat controls | Yes |
| Growth | Web monster maker, haunt a friend, the share loop | Yes |
| Website | System, home, maker, monster page, shared pages, invites, getting the app, Plus, wall, Unwrapped, plain pages, before launch, link previews, motion, copy | No: over the export limit |
| Camera | Four modes, before and after (after launch) | Yes |
| iPhone Duo | Foldable layouts (after launch) | Yes |

The boards also load `support.js`, `critters.js` and `fx.js` from the design
project. They are not exported yet, so the HTML here is for reading, not for
rendering.

## What is still missing

- "App flows" and "Website" must each be split into files under 200 KB. The
  design tool returns at most 256 KiB per file.
- One PNG per screen under `design/renders/<board>/<screen>.png`, and
  `design/screens.json`. Phase 00 does both.
- Not yet reviewed against the plan: "Settings and icon" on App flows, and
  Website sections 03 to 15.

## Precedence

`docs/product-brief.md` rules win over a board when they disagree. A board wins
over older notes. Where a board shows something the platform cannot do, build
the nearest honest thing and log it in `docs/undesigned-states.md`.
