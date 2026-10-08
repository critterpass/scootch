# Designs

The designs live in Claude Design, project
`e426dba8-d2f9-4598-b525-158a1a4968e5`
(https://claude.ai/design/p/e426dba8-d2f9-4598-b525-158a1a4968e5).

## Boards (exported 7 Oct 2026 from the founder's archive)

The boards are in this folder as `<board>.dc.html`, with the scripts they
load (`support.js`, `critters.js`, `fx.js`, `catch.js`), so each opens in a
browser as designed. App flows, Plus and Monsters and Keepsakes were exported
again on 8 Oct 2026; the other boards are as first exported.

| Board | Covers | At launch |
|---|---|---|
| Scootch (App flows) | First launch, the one screen, brain dump, session, the catch and rewards, not finished and coming back, settings and icon. Settings is one root page (attitude, your Plus card, look, feel, calm, people); its sub-pages are drawn on the boards of their topics | Yes |
| Monsters and Keepsakes | The monster, the eight catches, the world, the week's song, the binder (shelf, a card front and back, month pages), made to share (one composer and seven things to share) | Yes |
| Tables | Lobby, waiting alone, invite, full table, nudges, labels | Yes, friends only |
| Characters | 30 work modes, 20 monster bodies | Yes |
| System Surfaces | Live Activities, widgets, controls, notifications | Replaced by System Surfaces v2 |
| System Surfaces v2 (added 8 Oct 2026) | The hunt on the Lock Screen and Island in ten states, lurker widgets, notifications from the monsters with three bites, ten app icons, Settings · Look and wallpaper, every way to start, share into a monster, the table outside the app | Yes, without the distraction shield, calendar and location warnings and the Watch app |
| Plus | Locked controls, first offer, the sheet and the welcome, seven finishes, the studio (ink, finish and trail, each on its own stage), your card, the trial's last day, renewal, friend pass | Yes, without gifts. The Plus Materials board of 8 Oct 2026 was folded into this one and is no longer kept here |
| Care and Edge States | Serious mode, crisis, offline, AI unavailable, accessibility, privacy, seat controls | Yes |
| Growth | Web monster maker, haunt a friend, the share loop | Yes |
| Website | 15 sections: system, home, maker, monster page, shared pages, invites, getting the app, Plus, wall, Unwrapped, plain pages, before launch, link previews, motion, copy | Replaced on 8 Oct 2026 by Website v2 and the Scootch Web boards. Still the reference for the caught card, story and record pages, which the new boards do not draw |
| Website v2 and Scootch Web - Monster, Plus, Invites, Get, Help, 404, Wall, Unwrapped (added 8 Oct 2026) | The website as real pages, one board each, with one shared script, `web-fx.js` | Yes, without the wall, Unwrapped, gifts and courage from strangers. See `plans/261008-0239-website-redesign/plan.md` |
| Camera | Four modes, before and after | Yes (in scope from 8 Oct 2026) |
| iPhone Duo | Foldable layouts | After launch |

The eight ways to catch a task's monster, which took the place of hold to
finish, are now drawn in Monsters and Keepsakes, section 02, with `catch.js`.
The session's catch states in the screen registry were written before that
and still say they have no design reference.

The Plus board is committed with one line added to its script
(`if (!ps) return;` near the top of `componentDidUpdate`): as exported it
throws on its first update, and the render script refuses a board that
throws. The copy in Claude Design still has the fault.

Reading a board through the design tool stops at 256 KB, which cuts App flows
and Plus short. Export the project as a zip from Claude Design for those.

Every board has been read against the plan as text. Nobody has yet compared
the rendered screens.

The website boards are whole pages, not screens inside numbered sections, so
`render-design-screens.ts` finds no screens in them and `design/screens.json`
has no rows for them. Open a board in a browser beside the built page; the
site's own sheets come from `apps/web/tests/capture-sheets.spec.ts`.

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
