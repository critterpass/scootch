# Designs

The designs live in Claude Design, project
`458d4c8c-ff01-4813-8bcc-9c7e9a1f821b`
(https://claude.ai/design/p/458d4c8c-ff01-4813-8bcc-9c7e9a1f821b).

## Boards (exported 7 Oct 2026 from the founder's archive)

All thirteen boards are in this folder as `<board>.dc.html`, with the three
scripts they load (`support.js`, `critters.js`, `fx.js`), so each opens in a
browser as designed.

| Board | Covers | At launch |
|---|---|---|
| Scootch (App flows) | First launch, the one screen, brain dump, session, hold to finish and rewards, not finished and coming back, settings and icon | Yes |
| Monsters and Keepsakes | The monster, the world, the week's song, share cards and stories, the binder | Yes |
| Tables | Lobby, waiting alone, invite, full table, nudges, labels | Yes, friends only |
| Characters | 30 work modes, 20 monster bodies | Yes |
| System Surfaces | Live Activities, widgets, controls, notifications | Replaced by System Surfaces v2 |
| System Surfaces v2 (added 8 Oct 2026) | The hunt on the Lock Screen and Island in ten states, lurker widgets, notifications from the monsters with three bites, ten app icons, Settings · Look and wallpaper, every way to start, share into a monster, the table outside the app | Yes, without the distraction shield, calendar and location warnings and the Watch app |
| Plus | Locked controls, first offer, the trial's last day, renewal, friend pass | Yes, without gifts. Its sheet, trial-started and lifetime moments, shelf and manage page are replaced by Plus Materials |
| Plus Materials (added 8 Oct 2026) | Seven finishes, the sheet dressed up, the welcome, the studio (ink, finish, trail), your card, five things to share | Yes. It also replaces the share cards and stories of Monsters and Keepsakes |
| Care and Edge States | Serious mode, crisis, offline, AI unavailable, accessibility, privacy, seat controls | Yes |
| Growth | Web monster maker, haunt a friend, the share loop | Yes |
| Website | 15 sections: system, home, maker, monster page, shared pages, invites, getting the app, Plus, wall, Unwrapped, plain pages, before launch, link previews, motion, copy | Yes, without the wall, Unwrapped, gifts and before-and-after |
| Camera | Four modes, before and after | Yes (in scope from 8 Oct 2026) |
| iPhone Duo | Foldable layouts | After launch |

The Catch Concepts board (eight ways to catch a task's monster, which took
the place of hold to finish) is in the Claude Design project and has not been
exported here yet. Until it is, the session's catch states in the screen
registry say so in place of a design reference.

The Plus Materials board is committed with one line added to its script
(`if (!ps) return;` at the top of `componentDidUpdate`): as exported it throws
on its first update, and the render script refuses a board that throws. The
copy in Claude Design still has the fault.

Every board has been read against the plan as text. Nobody has yet compared
the rendered screens.

## One image per screen

`design/screens.json` lists every designed screen: board, section, screen
label, image path, and width and height in design points. The images are not
in the repository. Get them with:

```
tools/scripts/fetch-design-renders.sh
```

This unpacks them into `design/renders/<board>/<section>--<screen>.png`
(ignored by git). They are twice the design size, with a 12-point margin so
the device frame around a screen is not cut.

The `design renders` workflow makes them with
`tools/scripts/render-design-screens.ts` whenever a board or the script
changes on main, and keeps them as one zip on the `design-renders` release.
After changing a board, run the script here and commit the new
`design/screens.json`.

Know before comparing:

- A screen is a labelled element inside a numbered section. A board's title
  block and the three introductory blocks at the top of the app flows board
  hold no screens and are not rendered.
- The workflow runs on Linux, which has no San Francisco font: text the
  boards set in the system font is drawn in the runner's default sans-serif,
  so line breaks can differ slightly from an iPhone. Nunito is loaded.
- Moving parts (the characters, banners that fade in) are caught at whatever
  frame they were on.

## What is still missing

- Nobody has yet compared the rendered screens with the product brief by eye.
- Vietnamese: the boards are in English only. Vietnamese screens are checked
  on device sheets, not against a render.

## Precedence

`docs/product-brief.md` rules win over a board when they disagree. A board wins
over older notes. Where a board shows something the platform cannot do, build
the nearest honest thing and log it in `docs/undesigned-states.md`.
