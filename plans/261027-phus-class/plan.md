# Phu's Class: the build

Planned 27 Oct 2026. The product is `docs/product-brief.md`; the screens are
`design/phus-class/` (its README maps every board). The brief wins over a
board, a board wins over this plan's wording.

Phu's Class is built in this repository, in place: same monorepo, same CI,
native build and device workflows. Everything that only Scootch needed is
removed. Nothing here is "MVP": what the brief puts at launch is built.

## Decisions taken for the build

These answer the brief's open questions where the build needs an answer now.
Each is recorded in `docs/tech-decisions.md` by the foundation task.

| Question | Decision | Why |
|---|---|---|
| Rebuild or cut down (brief 14) | Cut down: keep the infrastructure (database, effects, sheets and motion, HTTP client, care gate, helplines, purchases port, native modules and targets), delete every Scootch feature, build the classroom as new feature folders | The infrastructure is tested and works on device; the Scootch screens share nothing with the classroom |
| How Thầy Phú is drawn | Skia, from the vector parts in `design/phus-class/Phu.dc.html`, `Prop.dc.html` and `Room.dc.html`. Poses are data (which arm, lens, lid, mouth and effect), animated with Reanimated. The same drawing is baked to images for widgets and the Live Activity | Skia is already in the app and bakes cleanly (Scootch spike 4). No Rive files exist yet, and Rive cannot be authored from code. Moving to Rive later replaces only the renderer |
| Hearing | Apple speech on the phone, on-device only, in the app's language. ElevenLabs is dropped | Brief 7 and 9: hearing must work offline and cost nothing |
| Picking and splitting | On the phone: the pick order, deadlines, heard times and splitting are ported from `apps/api/src/ai/task-create/` to `packages/domain`, as rules. Where Apple's on-device model is available (iOS 26 and later) it splits rambles and words lines through a small native module; the rules are the fallback and never wait on it | Brief 7: the free lesson must cost about $0.10 a month |
| Screening without a connection (brief 14) | The phone's keyword gate runs first and offline. A task said offline stays plain ("Written down.") until it is screened by Jev when the connection returns. The on-device model may only add caution, never clear a task | The care rules cannot depend on an untested classifier |
| His lines | Offline pack first (`packages/voice/offline/`), written per language. The server writes a fresh line only for a task the pack has no good line for, when online and screened | Brief 7 |
| Server | Hono on Workers, renamed: `phusclass-api` and `phusclass-api-dev`, D1 `phusclass` and `phusclass-dev`, at `api.phusclass.com`. No Durable Objects, no R2 (share images are made on the phone) | Tables and shared monsters are gone |
| Website | Astro on Workers at `phusclass.com`: home, tuition, privacy, terms, support, helplines, in English and Vietnamese | Brief 1 |
| Bundle ids | `com.phusclass` (prd) and `com.phusclass.dev` (dev), app group `group.com.phusclass(.dev)`, schemes `phusclass` and `phusclass-dev` | Registered 27 Oct 2026 |
| Purchases | RevenueCat projects "Phu's Class" and "Phu's Class Dev", entitlement `tuition`, offering `default` with `$rc_annual` and `$rc_monthly`. Products `phusclass.tuition.yearly` and `phusclass.tuition.monthly` (prd), `phusclass.dev.tuition.*` (dev), each with a one-week free trial | Created 27 Oct 2026, prices confirmed by the founder |
| Package scope | `@phusclass/*` replaces `@scootch/*` | The name in every import |

## Phases

| Phase | What | Lanes |
|---|---|---|
| 1 | Foundation and native batch one | 1, then the build |
| 2 | The classroom, the board, his voice, the server | 4 at once |
| 3 | The screens | 3 at once |
| 4 | Tuition, the timetable, sharing | 2 at once |
| 5 | Outside the app (native batch two) | 1 |
| 6 | Website, store and TestFlight | 2 at once |

Status lines below follow `CLAUDE.md`: `- Status: done — <sha>` or
`blocked — <reason>`.

---

## Phase 1: foundation

### 1.1 Rename and strip
- Status: done — pending merge
- Do:
  - Rename the package scope to `@phusclass/*` everywhere, and the root package to `phusclass`.
  - Delete every DROP item in `plans/261027-phus-class/inventory.md`. Leave the app booting to one placeholder desk screen that says "Sit." in the app language.
  - Rewrite `app.config.ts` for the new ids, names, scheme, app group and link host `phusclass.com`. Drop the App Clip, the alternate icons, the camera strings and the communication-notification entitlement. Add the calendar usage strings (en and vi).
  - New EAS project `phusclass` under the `critterpass` owner. Put the RevenueCat public keys in `eas.json`; the Sentry DSN comes later.
  - Workflows and scripts: every Scootch name the inventory lists.
  - Rewrite `CLAUDE.md` for Phu's Class (same rules, his voice section).
  - Update `docs/tech-decisions.md` with the table above.
- Owns: the whole repository except `design/`, `docs/product-brief.md` and this folder.
- Done when: CI is green on the pull request, and a grep finds no `scootch` in code outside history, `design/` (old boards) and `plans/261006*`–`plans/261008*`.

### 1.2 Native batch one
- Status: in progress: declared with the foundation, build after merge
- Do:
  - Declare every capability and target the screens need:
    - app group and keychain group
    - push, time-sensitive notifications and a notification service extension
    - widgets and the Live Activity: one target, shells only
    - the calendar (`expo-calendar`)
    - on-device speech
  - Rename the native modules to `phusclass-*`.
  - The on-device model module and the App Intents go in native batch two (5.1), so this build is not held up by them.
  - Run `native-build.yml` with `profile=e2e-test` and with `profile=dev submit=true`. That puts the first TestFlight build on "Phu's Class Dev".
- Done when: the `e2e-test` build is published for device runs and a dev build is processing in TestFlight.

## Phase 2: core (four lanes, JavaScript only)

### 2.1 The classroom renderer
- Status: done — pending merge
- Do: `packages/art` becomes the classroom.
  - Thầy Phú: 24 poses as data, built from shared parts.
  - The 19 props, and the room as a 1600×1000 world seen through a camera rectangle.
  - Moods 0 to 5, his pacing, the chalkboard text, desk carvings.
  - Ported from the `.dc.html` SVG.
  - Reduce Motion cuts instead of moving.
  - A dev route shows every pose and prop.
- Done when: a dev gallery screen on the simulator, with a sheet beside the `Poses` and `Props` boards.

### 2.2 The board and its rules
- Status: done — pending merge
- Do: in `packages/domain` and the app's SQLite:
  - Tasks, the pick order (brief 3), deadlines and heard times (ported to the phone).
  - Late slips with tallies, accepted reasons, front row at five.
  - Fading after two weeks and "Still yours?".
  - Pressure 0 to 5 from waiting time and slips; starting resets it.
  - Periods, partial credit, the logbook, the comment ladder and carvings.
  - Serious and crisis flags stop pressure.
  - New migrations from 0001.
- Done when: unit tests cover the pick order, pressure, slips, front row, fading, the comment ladder and the care rules.

### 2.3 His voice and hearing
- Status: voice half done — c2c80ed; composer done with the desk (3.1); screening by the server when online is todo
- Do:
  - The offline line pack for every moment the brief names, written fresh in English and in Vietnamese, with the banned-word lists and `check.ts` rules.
  - The composer: hold to talk with on-device speech and live words, typing, and "Hold it, then talk." for short taps.
  - Splitting a ramble into tasks on the phone, so a failed pick still lands every sentence on the board.
  - The care gate wired in.
- Done when: voice tests pass in both languages; composer tests cover the short-tap, offline and failed-pick paths.

### 2.4 The server
- Do: strip `apps/api` to what Phu's Class uses:
  - health, devices, data delete, backup
  - screen (Jev), lines (fresh line for a task), the RevenueCat webhook, scholarship, push
  - the Telegram bot
- Rename the workers and D1. Deploy dev to `api-dev.phusclass.com` and prd to `api.phusclass.com`. Set the secrets (names in `.env.example`).
- Done when: `GET /v1/health` answers on both, and the eval set for screening passes in CI.

## Phase 3: the screens (three lanes)

### 3.1 The desk and the session
- Status: done — pending merge
- Do:
  - The desk: one task, his line, the fuse around Start, pressure poses, the chalkboard with today's task, the next two and the count.
  - Start with the drum and the camera pulling back.
  - The session: pacing, raise a hand, a stray thought onto the board.
  - Time's up, Done, the red check, comment and confetti.
  - Not yet: partial credit and its three choices.
  - Recess, the late slip, the empty desk, offline.
  - Haptics and sound cues.
- Boards: `App`, `Desk`, `DeskHot`, `FrontRow`, `Listening`, `Typing`, `LateSlip`, `OfflineDesk`, `Session`, `Partial`, `Finish`, `Recess`, `RecessNotice`.

### 3.2 The board and the logbook
- Status: done — pending merge
- Do:
  - Pull down on the desk: the chalkboard grows into the board.
  - The board: his order, today underlined, dates, tallies; swap, reword, tick, erase.
  - "Still yours?", the long-board remark.
  - Pull down on the board: the logbook page with his signed comments.
  - Every gesture has a tap alternative.
- Boards: `NavPullBoard`, `Board`, `NavPullLog`, `LogbookPage`, `LogbookEmpty`.

### 3.3 First day, settings and care
- Status: done — pending merge
- Do:
  - First day's four beats: the classroom push-in, roll call with the full name, notes home with one real example, the empty desk.
  - Settings, with export and delete everything.
  - Serious mode: quiet, grey, glasses off.
  - Crisis with helplines.
  - Notes home: up to three a day, quiet hours, going silent when ignored.
- Boards: `Splash`, `FirstDay`, `RollCall`, `NotesHome`, `EmptyDesk`, `Settings`, `Serious`, `Crisis`.

## Phase 4: tuition, timetable, sharing (two lanes)

### 4.1 Tuition and the timetable
- Status: done — pending merge
- Do:
  - The receipt with the two plans and the trial card (today, his reminder, first charge), PAID, pending and failed.
  - The scholarship. Locked controls where paid things live.
  - The first offer after the third finish, at the next recess, pinned to the chalkboard.
  - The charge reminder note, the win-back offer.
  - The timetable sheet: swipe the desk up; the dial, free periods with his pick and Book it.
  - Calendar permission asked on first open; weekend, ask and locked states.
  - The report card.
- Boards: `Tuition*`, `Scholarship*`, `NavSwipeUp`, `TimetableSheet`, `Timetable*`, `ReportCard`.

### 4.2 Sharing
- Status: done — pending merge (roll call must write the full name to `student.fullName`; until then the cards say "my student")
- Do:
  - The four formats with white-out tape: the test paper, the giấy khen, the sổ liên lạc note and the carved desk.
  - Made on the phone; never offered for a serious task, nothing on a crisis day.
- Boards: `ShareCard`, `ShareSheet`.

## Phase 5: outside the app (native batch two)

### 5.1 Surfaces
- Status: built — native builds dispatched from `native/batch-two-surfaces`; merged after they pass
- Do:
  - The on-device model module (`modules/phusclass-intelligence`): splitting a ramble and a light care check on iOS 26 and later, with a stub elsewhere. The rules from 2.3 stay the fallback.
  - The Live Activity and Dynamic Island: his face at the current pressure, the fuse, the session timer.
  - Widgets: small, medium, the timetable (tuition), Lock Screen accessories, StandBy at night.
  - Notifications with his face.
  - App Intents for Siri and Shortcuts.
  - Baked poses from 2.1.
- Board: `Outside`. Then a dev TestFlight build.

### 5.2 iPhone Duo
- Do: the layouts of `Duo` and `DuoGuide`, built from the same components.
  - Closed, open, book, stand and split.
  - Nothing resets when the fold state changes.
- Done when: simulator sheets at the assumed sizes.

## Phase 6: website, store, TestFlight (two lanes)

### 6.1 Website
- Status: done — pending merge (email routing for hello@ and support@, and the prd deploy, are left to the founder)
- Do: phusclass.com in English and Vietnamese:
  - home with Thầy Phú, tuition, privacy, terms, support, helplines
  - `apple-app-site-association`, an `.well-known` contact, link previews
- Email routing for hello@ and support@ to the founder.
- Done when: deployed and every page reads well on a phone.

### 6.2 Store and TestFlight
- Do:
  - The App Store listing in English and Vietnamese: name, subtitle, keywords, description, privacy answers, age rating.
  - Screenshots from the simulator, including iPhone Duo.
  - The review note, subscription review screenshots.
  - The internal TestFlight group with the founder.
  - A prd build uploaded, not submitted for review: submission is the founder's call.
- Status: blocked — screenshots (6.9" and 6.3", en-US and vi) and the review note are set; the review contact phone is the founder's to add, iPhone Duo screenshots wait for the Duo layout, and the prd build is not uploaded yet
