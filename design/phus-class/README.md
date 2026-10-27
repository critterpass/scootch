# Phu's Class designs

Exported on 27 Oct 2026 from the Claude Design canvas
(https://claude.ai/artifact/Eg6LuZFgQgSEjh8j13BWo7, version 34). The product
brief (`docs/product-brief.md`) wins over these boards when they disagree.

Each board is a `<board>.dc.html` file that opens in a browser beside
`support.js`, the canvas runtime it was drawn with. `canvas.json` holds the
canvas layout: where each board sits and the titles of its rows.

The handwriting font, Kithfield Hand, is not in the repository. The boards
load it from the canvas, so opened locally they fall back to a rounded system
font. Every line Thầy Phú speaks on a board is design copy: in the app, online
lines come from the AI routes and offline lines from `packages/voice/offline/`.

## Components

Boards that other boards import. Change one and every screen that uses it
changes.

| File | What it is |
|---|---|
| `Phu.dc.html` | Thầy Phú: 24 poses built from shared parts (arms, lenses, lids, mouths, effects), ready to rig in Rive |
| `Prop.dc.html` | 19 classroom props, with their moving parts on their own layers |
| `Room.dc.html` | The wide classroom (door, notice board, wall fan, bookshelf, two rows of desks), seen through any camera rectangle, with the board on or off the wall |
| `Dial.dc.html` | The day dial: classes in slate, free periods in red, booked periods solid red, the time now as a knob |
| `AppIcon.dc.html` | The app icon |
| `App.dc.html` | The playable phone prototype: first day, desk, board, logbook, timetable sheet, session, finish, recess, late slip and the happenings. Most phone boards are this file with props |

## Rows on the canvas

| Row | Boards |
|---|---|
| Thầy Phú, his things, how they move | `Main`, `Rig`, `Poses`, `Props`, `Motion` |
| Never the same twice | `NeverTwice` and the happenings: `HapCat`, `HapPlane`, `HapPower`, `HapFlowers`, `HapQuiz`, `HapRain` |
| First day of class | `Splash` (tap to replay), `FirstDay`, `RollCall`, `NotesHome`, `EmptyDesk` |
| One task on the desk | `App`, `Desk`, `DeskHot`, `FrontRow`, `Listening`, `Typing`, `LateSlip`, `OfflineDesk` |
| The drum, and after | `Session`, `Partial`, `Finish`, `Recess`, `Serious`, `RecessNotice` |
| Pull and swipe | `NavSwipeUp`, `TimetableSheet`, `NavPullBoard`, `Board`, `NavPullLog`, `LogbookPage`, `LogbookEmpty` |
| Around the classroom | `Settings`, `Crisis`, `TimetableAsk`, `TimetableWeekend`, `TimetableLocked`, `ReportCard` |
| Share | `ShareCard`, `ShareSheet` |
| Outside the app | `Outside`: Lock Screen, Dynamic Island, notifications, widgets, StandBy |
| Tuition | `Tuition` and its states (`TuitionTrial`, `TuitionPaid`, `TuitionPending`, `TuitionFailed`), `Scholarship`, `ScholarshipGranted`, `Money` (the plan and its costs) |
| iPhone Duo | `Duo` (playable: tap a pose), `DuoGuide`, `DuoClosed`, `DuoOpen`, `DuoBook`, `DuoStand`, `DuoSplit`, `Room` |

`Timetable.dc.html` and `Logbook.dc.html` are earlier full-screen versions,
replaced by the timetable sheet and the logbook page in `App.dc.html`. They
are kept for reference and are not on the canvas.

## Assumptions to replace

- **iPhone Duo sizes.** The boards were drawn at an outer display of
  480 × 620 pt and an inner display of 960 × 620 pt. Measured on the iOS 27.1
  simulator (Xcode 27.1, `xcrun simctl io <device> enumerate` and
  `xcrun devicectl device info displays`), at 3×:
  - outer display: 1398 × 2034 px, **466 × 678 pt**, portrait, camera in the
    top trailing corner;
  - inner display: 2007 × 2853 px, **669 × 951 pt** in portrait and
    **951 × 669 pt** in landscape, folding at its middle (x 475.5 in
    landscape, y 475.5 in portrait).
  The strip kept clear around the fold when half open is the system's division
  region (`UIView.reservedRegions(kind: .division)`); the app reads it and
  keeps 48 pt only where the system does not say. The layouts in
  `apps/mobile/src/ui/fold/fold-layout.ts` place everything from these sizes,
  in proportion to the boards.
- **Tuition prices.** $39.99 a year and $6.99 a month (499.000đ and 79.000đ)
  are proposals; see the brief, section 14.
