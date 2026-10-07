# Camera

Status: planned, nothing built · Created 8 Oct 2026 · Board:
[Scootch - Camera](../../design/Scootch%20-%20Camera.dc.html), section 01
(nine screens, listed in `design/screens.json`).

The founder moved the camera from the after-launch list into scope on
8 Oct 2026. Read [product-brief.md](../../docs/product-brief.md) sections 2, 6
and 7 before any task here.

## What it is

When words won't come, point the phone at the mess. Four modes each turn one
photo into one ringed first step, and that step becomes the day's one thing
through the same task call as a typed task. A before-and-after card closes
the loop.

| Mode | Reads | Step | Price |
|---|---|---|---|
| Desk | Objects, on the phone | The one that leaves fastest | Free |
| Room | Zones, on the phone | The smallest corner | Free |
| Paper | The words on a form, letter or bill | The easiest box, jargon translated | Plus, one free try |
| Screen | The words on a photographed screen | The one email, tab or message, with a first line | Plus, one free try |

## Decided 8 Oct 2026

| Decision | Choice | Why |
|---|---|---|
| Who reads Paper and Screen | The phone first, as CritterPass reads receipts: Apple's Vision recognises lines and their boxes; only the words go to DeepSeek, which answers by line id. The photo is sent to DeepSeek only when the phone cannot read it | No new provider or key; the photo usually never leaves; a box or a row on screen is always a real recognised line |
| Free tries | One Paper scan and one Screen scan, then a quiet lock on each chip | Founder |
| Desk and Room | Never leave the phone as pictures. The labels found (for example "mug", "papers") go to the line route when online; offline the line comes from `packages/voice/offline/` | Scootch's lines are never hard-coded in a screen |
| Numbers | Every count shown (zones, boxes, "214", before-and-after figures) is counted by code from what the phone recognised. The model writes words only | CritterPass: no model number reaches the screen unchecked |
| Care | Recognised words pass the care screen before any line is written. Serious or crisis: no joke, no monster, no before-and-after, no share | Brief section 6 |
| Android | The reading module is iPhone only. On Android the camera button is not shown | Android is a test device, not a release |

## Phases

| # | Phase | Tasks | Needs | Branch kind |
|---|---|---|---|---|
| 01 | [Native batch: camera and on-device reading](phase-01-native-camera-and-reading.md) | 4 | — | native batch |
| 02 | [Rules, routes and lines](phase-02-rules-routes-and-lines.md) | 6 | — | JavaScript |
| 03 | [Opening, viewfinder, Desk and Room](phase-03-viewfinder-desk-and-room.md) | 5 | 01, 02 | JavaScript |
| 04 | [Paper and Screen](phase-04-paper-and-screen.md) | 5 | 03 | JavaScript |
| 05 | [Before and after](phase-05-before-and-after.md) | 4 | 03 | JavaScript |

Phases 01 and 02 share no files and can run side by side. Phase 01 changes the
native fingerprint: the build in testers' hands cannot show the camera until
they install the build that phase produces. Until then the camera button is
absent, because the app asks whether the reading module exists.

## Done when

- A fresh user with no seed opens the camera from the one screen, grants the
  permission, photographs a desk and starts a session on the ringed thing, on
  a device run.
- Desk and Room work in aeroplane mode.
- The first Paper scan shows the consent sheet before anything is sent; "Not
  now" sends nothing.
- A free user gets exactly one Paper and one Screen scan; the lock never
  opens the Plus sheet on a heavy day or during a session.
- A letter the care screen marks serious gets a plain step and nothing else.
- The privacy page in the app and on the website name what the camera sends
  and keeps, and match the code.
- Design-beside-device sheets exist for all nine board screens and every
  state logged in `docs/undesigned-states.md`, in English and Vietnamese.

## Not in this plan

- The website's before-and-after page (the board draws a shared image only).
- Reading on Android.
- Server-side enforcement of Plus for camera routes: the server does not yet
  know who has Plus (full build plan, phase 08). The free try is counted on
  the phone; the routes are rate limited per device.

## Open questions

1. Device runs have no camera. The plan feeds a bundled test photo through
   the same reading module in the `e2e-test` build only. Is that acceptable as
   the one test double at the camera boundary?
2. Before-and-after figures are limited to what the phone can count (minutes,
   things gone from the picture, zones cleared). The board's "14 papers
   stacked" cannot be counted honestly on the phone. Accept the smaller set?
3. DeepSeek's terms were confirmed for text. The photo fallback sends an
   image: does the no-training setting cover images too?
