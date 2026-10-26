# Scootch full build

Status: v1.0.0-rc.6 runs in production (API and site, 12 Oct) and an App Store
build from `2ae2c3d` is submitted (12 Oct). The day loop, the starting helpers
and a website monster's way into the app have been seen on a phone; care,
money, tables, push and the camera have not been proven. Audited against the
code 13 Oct 2026 · Created 6 Oct 2026 · Scope: everything in
[product-brief.md](../../docs/product-brief.md) sections 3 to 9. The
after-launch list (gifts, iPhone Duo, monster wall, Unwrapped, Android
release, tables with strangers) is section 10 there and is not planned here.
The camera left that list on 8 Oct 2026 and has its own plan:
[261008-0033-camera](../261008-0033-camera/plan.md).

Decided 6 Oct 2026: public repository at github.com/critterpass/scootch,
RevenueCat, English and Vietnamese at launch, tables for friends only.

Phases are ordered by dependency and sized by task count. No time estimates.

## Phases

| # | Phase | Tasks | Needs | Status (13 Oct 2026) |
|---|---|---|---|---|
| 00 | [Spikes and founder gates](phase-00-spikes-and-founder-gates.md) | 9 | — | done |
| 01 | [Foundation and native shell](phase-01-foundation-and-native-shell.md) | 11 | 00 | done: native builds on GitHub runners (dev and prd), TestFlight, dev deploys from main, prd deploys from release tags, over-the-air updates for dev and the App Store app, Sentry |
| 02 | [Characters and sound](phase-02-characters-and-sound.md) | 8 | 01 | works on a phone; the motion pass is merged (catches, bursts, sheets that carry the finger's speed) and has no founder sign-off on record |
| 03 | [AI routes, API and ops bot](phase-03-ai-api-and-ops-bot.md) | 9 | 01 | the task call, screening and the helpers' lines work on dev and prd; the small routes and eval reports to the bot are not built; the last three evals runs on main (9 Oct) failed |
| 04 | [The day loop](phase-04-day-loop.md) | 10 | 01 (art and routes arrive from 02, 03) | works on a phone end to end, with the home revamp and the starting helpers; saying "done" to finish is not wired |
| 05 | [Keeping: cards, world, record, share](phase-05-keeping.md) | 8 | 02, 04 | redrawn (binder, keeping tabs, one share composer) and merged; sharing never walked; the week's name, wearing a drop and the record video are not built |
| 06 | [System surfaces](phase-06-system-surfaces.md) | 7 | 02, 04 | replaced by [the redrawn surfaces](../261008-0120-system-surfaces-outside-the-app/plan.md): built; the widgets at rest and the Live Activity seen on a phone, the rest unseen; no remote push reaches a phone |
| 07 | [Care, edge states and settings](phase-07-care-edge-and-settings.md) | 8 | 03, 04 | serious, crisis and offline walked as a fresh user on the simulator (13 Oct, #199, #201, #203); restore and a real phone not yet |
| 08 | [Plus](phase-08-plus.md) | 8 | 05 | redrawn twice and merged; inks dress Scootch and the app; no purchase ever made; no webhook; the server does not check Plus |
| 09 | [Tables and haunting](phase-09-tables-and-haunting.md) | 8 | 03, 04 | the app half is built and has ways in; Sign in with Apple has never completed on a build; push is off; seven server items open |
| 10 | [Website and growth](phase-10-website-and-growth.md) | 8 | 02, 03 | redrawn and live at scootch.app from release tags; a monster's link opens the app (founder, 9 Oct); the App Clip has never been opened |
| 11 | [Launch](phase-11-launch.md) | 7 | all | started: production deployed, App Store build submitted 12 Oct; Care gate passed on the simulator 13 Oct; Money gate not passed |

## Follow-on plans

| Plan | Status (13 Oct 2026) |
|---|---|
| [Home, drawer and hatch revamp](../261007-1936-home-drawer-hatch-revamp/plan.md) | merged 7 Oct (#96) |
| [Tables: ways in and settings](../261007-2126-tables-ways-in-and-settings/plan.md) | app half merged (#107, #109, #112); seven server items open; not seen on a device |
| [Camera](../261008-0033-camera/plan.md) | merged (#115, #116, #118); the button left home on 8 Oct (#123), so no way in; never run on a device |
| [Plus, in real materials](../261008-0049-plus-materials/plan.md) | merged (#117, #119), then redrawn by the binder plan; Wallet pass and stickers not built |
| [System surfaces, redrawn](../261008-0120-system-surfaces-outside-the-app/plan.md) | merged (#120, #124, #126, #134, #140); the Live Activity and Island seen on a phone, the rest not |
| [Website, redrawn](../261008-0239-website-redesign/plan.md) | merged (#121, #122, #175, #176) and live; largest text and a real phone not checked |
| [Plus, binder, share and settings, as redrawn](../261008-1021-plus-binder-share-settings-as-redrawn/plan.md) | merged (#125); not seen on a device |
| [Keeping tabs, sheets, share polish](../261008-1230-keep-tabs-sheets-share-polish/plan.md) | merged (#127, #129); both from the founder's notes on his phone, 8 Oct; not seen on a device since |
| [Starting helpers](../261008-2249-starting-helpers/plan.md) | released in rc.6 and the submitted App Store build; two items left (a "next time" walk, offline sheets) |
| [A website monster arrives in the app](../261008-2310-website-monster-into-the-app/plan.md) | merged (#147 to #153, #158, #161); founder checked on a phone 9 Oct; the App Clip never opened |

## Where it stands (13 Oct 2026, audited against the code)

PRs #96 to #193 merged between 7 and 12 Oct. Production runs v1.0.0-rc.6
(`a961d4a`, tagged 12 Oct) at scootch.app and api.scootch.app. prd native
builds ran from `af7ed48` (9 Oct), `2ae2c3d` (12 Oct) and `76e71dc` (13 Oct);
the App Store build from `2ae2c3d` was submitted on 12 Oct. "Built" below
means code and tests exist; only "works on a phone" has been seen by a person
or a device run.

The fresh-user walk (`e2e/fresh`) last passed on GitHub on 7 Oct. Every run of
it since was cancelled or failed; device runs since 9 Oct are capture runs of
chosen states and one tour video. The founder waived the full walk for the
release on 8 Oct.

### Works on a phone

The day loop from hello to a caught card, the world, the zoo, the record,
settings, privacy, the delete dialog, helplines and Vietnamese (7 Oct). Home
with the composer, the drawer and the hatch (#96), seen by the founder on the
8 Oct build, with the Plus sheet, the haunt chip and the share composer from
the same notes. A monster made on scootch.app arriving in the dev and App
Store apps as itself (founder, 9 Oct). The starting helpers' states in
English, Vietnamese and at the largest text (capture runs, 12 Oct). The
widgets at rest (TestFlight, 12 Oct). The Live Activity and the Island on a
phone, whose clipping was then fixed (#134, #140); the fixes are unseen. The
session's paper bursts (tour video, 13 Oct). Free people get ten things a
day, Plus twenty-five (#79).

### Reachable but never walked

Hold to talk, pick for me, too big, "I'm stuck", "I'm done" early, not
finished, the reveal's later steps, sharing a card or story, the surprise
drop, the serious and crisis screens and closing the care screen, offline, the
Plus sheet's purchase and the manage page, the studio, the binder, export my
data, the restore offer, Lock Screen accessories, local notifications and a
tap on one, quiet hours, controls, Siri and Shortcuts, the Focus filter, the
share extension, Settings › Tables and the friends page.

### Written but a person cannot use it

- **Tables and friends:** ways in exist (the set task, a friend's table on
  home, a friend's link, Settings › Tables › Invite), and friend invites and
  accepts have routes. Every one needs Sign in with Apple, which has never
  completed on a build. Seven server items in the tables plan are open.
- **Remote push:** the server can send (`apps/api/src/push/`, `push-tokens`
  route) but the `push.remote` flag is off, Apple's key is not set, and the
  phone registers no token. Nothing can tell a phone about a haunt, a nudge or
  a table.
- **Plus:** no purchase has ever been made. The server trusts the phone's word
  for Plus (table seats, the member number) and has no RevenueCat webhook.
- **The camera:** written and tested off a phone; its button left home on
  8 Oct (#123) and nothing else opens it.
- **The App Clip:** built (#150) and in the App Store build; never opened.
- **Saying "done" to finish:** a choice in Settings and a rule in the session,
  but nothing on the phone listens for it.
- **Wearing a surprise drop:** the choice is stored and drawn nowhere.
- **The week's name on a record:** the record shows a stored name; nothing
  writes one.
- **Backup and restore:** needs iCloud on the build and two phones to prove.

### Not built

- The small AI routes (shrink, stuck, pick, morning line, weekly sentence,
  record name): the phone does the first three from the task's pack. The
  bargain went with "Not now" (#96).
- The weekly sentence and "learns you".
- The shared record as a video, with its read route: a record is shared as a
  sleeve picture.
- The RevenueCat webhook and server-side Plus; eval reports to the bot; a
  launch-day email.
- Wallet pass and sticker pack; the Focus filter's work and home switches.
- Tables' server half: history with a friend, a name on a waiting link, a
  friend's table with its word, saved seats by name, "Tell me when someone
  sits", table lengths, "Your one thing" on a link's landing.

### Measured

Crisis screening on #173 (9 Oct), three runs against dev: 233 of 239 each,
no crisis missed; the six misses are harmless notes, three judged crisis and
three judged reject. The helpers' task eval on dev 234 of 240, both helper
sets 16 of 16, the waiting pick 12 of 12. The last three evals runs on
main (9 Oct) failed, the latest on a fetch error in the task eval, so nothing
is measured on main after 8 Oct. Earlier (7 Oct): name and hatch line 1.9 s, pack 3.7 s; lines
regenerated on 18.8% of calls against a target under 10%.

### The work queue (design against code, 7 Oct)

Four read-only reviews compared the brief and the design boards (including
the design's own animation code) with the code, flow by flow. Much of it was
answered by the redrawn plans above; a lane still ticks an item by quoting its
number.

- [What a person can reach](reports/261007-reachability-audit.md)
- [Day loop and care](reports/261007-design-vs-code-day-loop-and-care.md)
- [Characters, keeping and Plus](reports/261007-design-vs-code-characters-keeping-plus.md)
- [Tables, system surfaces and website](reports/261007-design-vs-code-tables-surfaces-website.md)

Decided 7 Oct after these: a free person can join any table and open a table
of two; a larger table needs Plus.

### Next, in order

1. The money gate: the webhook in RevenueCat's dashboard, then a sandbox
   purchase, restore and cancel on the founder's phone, read back on the
   server's record.
2. System surfaces on the founder's phone: a hunt from a widget with the app
   closed, the Lock Screen, StandBy, notifications and their actions, the share
   sheet. The camera stays hidden by the founder's choice (13 Oct) until its own
   design pass places the way in.
3. What remains from the not-built list, with remote push and Sign in with
   Apple first, so two friends can sit at a table.
4. Production and launch.

## Order of work

At most three lanes at a time, one per column. A row starts when the row above
has merged.

| Round | Lane A | Lane B | Lane C |
|---|---|---|---|
| 1 | 00 spikes (each a ten-minute lane) | 00 design export | founder gates (founder) |
| 2 | 01 repository, CI, device pipeline | 01 native shell and first build | — |
| 3 | 02 characters and sound | 04 day loop | 03 AI, API, bot |
| 4 | 05 keeping | 06 system surfaces | 07 care and settings |
| 5 | 08 Plus | 09 tables and haunting | 10 website and growth |
| 6 | 11 launch | — | — |

Round 3 works because phase 01 fixes the contracts first: the art package's
component props, the AI routes' request and response types, and a recorded
fixture for each route. Lane B builds against placeholders and fixtures until
A and C merge.

## Gates

| Gate | When | What must be true |
|---|---|---|
| Voice | End of 00 | Passed 7 Oct 2026: the founder read the samples in both languages; DeepSeek writes Scootch |
| Native batch one | End of 01 | Passed: a TestFlight build installed 7 Oct 2026; prd native builds since 9 Oct. No record yet of an over-the-air update seen arriving on a phone |
| First minute | End of 04 | Passed online 7 Oct 2026 on a device run and on the founder's iPhone; offline for the session is not yet walked |
| Care | End of 07 | Passed on the simulator 13 Oct 2026: the screening eval against dev scored 233 of 239 with no crisis missed and every serious and crisis case right (the six misses are ordinary tasks called too heavy); the fresh walk 01 to 11 passes in order with serious, crisis and offline (#199, #201, #203) and shows no monster, joke, card, share or burst on a heavy task, online or held offline (#197, #203). Not yet seen on a real phone |
| Money | End of 08 | Not passed. The server keeps its own Plus record from RevenueCat's webhook (#195) and the app logs in to RevenueCat with the id the server hands out (#196); the dashboard's webhook and a sandbox purchase, restore and cancel on the founder's phone are still to do |
| Release | End of 11 | Not passed. prd deployed from v1.0.0-rc.6 on 12 Oct 2026 and served that commit on its health check (run 38252230612); no fuller smoke check is recorded. The full fresh-user walk on the release candidate is not required: the founder waived it on 8 Oct 2026 |

Each phase also ends with design-beside-device sheets for every screen it
touched, and its part of the fresh-user walk.

## Repository layout

```
apps/mobile      Expo app; src/features/<area>; targets/ for Swift
apps/api         Hono on Workers: routes/, tables/ (Durable Object), bot/
apps/web         Astro site
packages/art     Scootch, monsters, cards (Skia) and the pose baker
packages/sound   Cues, the daily bar, the record
packages/voice   Prompts, the voice guide, offline lines, eval sets
packages/domain  Pure logic: session, drawer, back-off, rarity, entitlements
packages/tokens  Inks, type, spacing, motion
tools/scripts    Lane install, capture, checks
e2e              Flows; e2e/fresh/ is the fresh-user walk
design           Exported boards and renders
```

Ownership is by folder. Two lanes never own the same folder in the same round.

## Founder gates

Things only the founder can do. Phase 00 lists them with the exact steps.

1. Done: scootch.app is registered through Cloudflare.
2. Done 7 Oct: the EAS project exists (id in tech-decisions section 1).
3. Done: the dev ids (`app.scootch.dev`) and the production ids
   (`app.scootch`) with their App Clip, widgets and notification service;
   prd native builds succeed from 9 Oct and the App Store build carries the
   App Clip.
4. Done 7 Oct: both apps exist in App Store Connect ("Scootch Dev" and
   "Scootch: Tiny Task Monsters"), with their products and RevenueCat apps;
   the public SDK keys are in the build profiles. Production product ids
   carry a `scootch_` prefix, because Apple keeps ids unique per account.
5. Done 7 Oct: the CritterPass Jev, DeepSeek and ElevenLabs keys are reused,
   and the founder confirmed DeepSeek's terms and switched off training use.
6. Done 7 Oct: the bot token and the founder's chat id are set.
7. Done 7 Oct: the full design archive is in `design/`.
8. Done 7 Oct: voice approved.
9. Done 7 Oct: a Cloudflare API token and account id are repository secrets.
10. Approved 7 Oct: EAS builds for Scootch (never for a JavaScript-only
    change).
11. Done on dev: Apple's push key is set on the dev Worker (`APNS_KEY_ID`, `APNS_KEY_P8`, `APNS_TEAM_ID`); remote push is still off behind its flag and the phone does not yet register a token.

## Decided 7 Oct 2026

- Free Scootch is three things a day; the Plus number is open. (Changed the
  same day: ten free and twenty-five with Plus, #79.)
- The founder does not proof-read Vietnamese copy; the completeness and
  banned-word checks stand in.
- "Haunt a friend" is on the hatch screen only, not in the drawer.
- Sign-out unlinks the account and keeps the device's own token.
- The sender of a haunt may see "waiting" or "gone" through its link.
- A shared record is a video.
- Vietnam's helplines: 115 first, then Ngày mai and Hy Vọng Sống with their
  hours, and 111 as the children's line.

## Decided 8 Oct 2026

- The production API answers at `api.scootch.app`.
- The founder read Tele-MANAS's number and Hy Vọng Sống's hours at their own
  sources; no helpline row holds production any more.
- The release does not wait for the full fresh-user walk.
- Crash reports go to Sentry from the dev and the App Store app.
- The care screen can be closed; the day is quiet until the next thing is
  typed (#142, product brief section 6).
- The oldest iOS is 17.0 (system surfaces plan; `app.config.ts`).

## Unresolved questions

Decided since 7 Oct and removed: how many things a day Plus allows
(twenty-five, #79); "Send the link to my phone" (the Get page offers a QR code
and an email form, no text messages, #121 and #149); the support page's
promise (the Help page says a person reads every message, with no time,
#121); the minimum iOS version (17.0, decided 8 Oct in the system surfaces
plan); whether the crisis screen has a way out (it can be closed, #142).

1. Does a free user see the weekly sentence in the world, or is it Plus only.
2. Whether monsters made on the website can be sent as haunts.
3. Whether `help@`, `privacy@` and `press@scootch.app` exist as mailboxes;
   the site and app print all three.
