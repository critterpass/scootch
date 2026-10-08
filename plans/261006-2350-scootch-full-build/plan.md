# Scootch full build

Status: the day loop runs on a real iPhone (TestFlight, 7 Oct); most of the rest is
written but not reachable or not proven. Audited against the code 7 Oct 2026 · Created 6 Oct 2026 · Scope: everything in
[product-brief.md](../../docs/product-brief.md) sections 3 to 9. The
after-launch list (gifts, iPhone Duo, monster wall, Unwrapped, Android
release, tables with strangers) is section 10 there and is not planned here.
The camera left that list on 8 Oct 2026 and has its own plan:
[261008-0033-camera](../261008-0033-camera/plan.md).

Decided 6 Oct 2026: public repository at github.com/critterpass/scootch,
RevenueCat, English and Vietnamese at launch, tables for friends only.

Phases are ordered by dependency and sized by task count. No time estimates.

## Phases

| # | Phase | Tasks | Needs | Status |
|---|---|---|---|---|
| 00 | [Spikes and founder gates](phase-00-spikes-and-founder-gates.md) | 9 | — | done |
| 01 | [Foundation and native shell](phase-01-foundation-and-native-shell.md) | 11 | 00 | done in substance: builds on GitHub runners, TestFlight, device walk, dev deploys from CI, over-the-air updates |
| 02 | [Characters and sound](phase-02-characters-and-sound.md) | 8 | 01 | works on a phone as stills; motion, transitions and feedback need a full pass (founder, 7 Oct) |
| 03 | [AI routes, API and ops bot](phase-03-ai-api-and-ops-bot.md) | 9 | 01 | the task call and screening work on dev; the small routes, push and eval reports are not built |
| 04 | [The day loop](phase-04-day-loop.md) | 10 | 01 (art and routes arrive from 02, 03) | works on a phone end to end; several branches never walked; say "done" and the website hand-off are not built |
| 05 | [Keeping: cards, world, record, share](phase-05-keeping.md) | 8 | 02, 04 | card, world, zoo and record work; sharing never walked; the week name, wearing a drop and the record video are not built |
| 06 | [System surfaces](phase-06-system-surfaces.md) | 7 | 02, 04 | written, never proven: widgets, Live Activity and notifications unseen; the App Clip and notification service are shells; no remote push |
| 07 | [Care, edge states and settings](phase-07-care-edge-and-settings.md) | 8 | 03, 04 | settings, privacy and helplines work; serious, crisis, offline and restore never walked on a device |
| 08 | [Plus](phase-08-plus.md) | 8 | 05 | screens written; no purchase ever made; inks are not applied; the weekly sentence is not wired; the server does not enforce Plus |
| 09 | [Tables and haunting](phase-09-tables-and-haunting.md) | 8 | 03, 04 | written and deployed, not usable: no way to become friends, sign-in never run, opening a table needs Plus |
| 10 | [Website and growth](phase-10-website-and-growth.md) | 8 | 02, 03 | on the dev site only; no production site, no universal links, the record page has no data |
| 11 | [Launch](phase-11-launch.md) | 7 | all | not started |

## Where it stands (7 Oct 2026, audited against the code)

The founder installed the first TestFlight build on 7 Oct and went from hello
to a caught monster. "Built" below means code and tests exist; only "works on
a phone" has been seen by a person or a device run.

### Works on a phone

First launch, typing a task, the energy question, the one thing, the hatch
with a named monster, the treat field, a session of 10, 25 or 50 minutes,
parking a thought, finishing by tapping twice, the caught card, the world, the
zoo, the record, settings (attitude, finish-with, language), privacy, the
delete dialog, helplines, and Vietnamese. Free people get three things a day
(founder, 7 Oct); Plus is six until the founder sets it.

### The founder's first notes (7 Oct), all open

- No animation, transitions, micro-interactions, action feedback or character
  motion to speak of: the whole app needs a careful motion and feel pass.
- The drawer sheet's layout is broken and unfinished.
- "Your world" and the record could not be tapped on the done-for-today home.
- No way to start another thing after the first (now three a day).

### Reachable but never walked

Hold to talk, "Another", a heard deadline, pick for me, "Not now", too big,
"I'm stuck", "I'm done" early, hold to finish, not finished, the reveal's
later steps, sharing a card or story, the surprise drop, the serious and
crisis screens, offline, the Plus sheet and manage page, the shelf, export my
data, widgets, Lock Screen accessories, the Live Activity, local
notifications, quiet hours.

### Written but a person cannot use it

- **Tables:** the lobby is behind a small "Sit with someone" link under a set
  task. Opening a table needs Plus, then Sign in with Apple (never run on a
  build), then a name. Joining works only by pasting a code.
- **Friends and haunting:** there is no way to become friends: the invite link
  points at a page that does not exist and the app cannot open links. Without
  a friend nothing can be sent or received.
- **Plus:** no purchase has ever been made; whether the products load on the
  dev build is unknown. A bought ink is applied nowhere outside the shelf
  preview. The server trusts the phone's word for Plus.
- **Backup and restore:** needs iCloud on the build and two phones to prove.

### Not built

- Remote push of any kind (no APNs code or key on the server, no token route),
  so nothing can tell a phone about a haunt, a nudge or a Live Activity update.
- Universal links, the App Clip (a placeholder), arriving with a monster from
  the website, the app banner and QR on the site.
- The small AI routes (shrink, bargain, stuck, pick, morning line, weekly
  sentence, record name): the phone does the first four from the task's pack.
- The weekly sentence and "learns you", the week's name on a record, wearing a
  surprise drop, outfits and worlds on the shelf, saying "done" to finish,
  Siri and Shortcuts, respecting Sleep and Focus, a notification that starts a
  session when tapped, "Invite a friend" in settings.
- The shared record as a video, with its read route.
- The RevenueCat webhook, eval reports to the bot, a launch-day email.
- Production: scootch.app, the production API and database, and the
  production App Clip, widgets and notification service ids.

### Measured

Crisis notes caught 67 of 67 with none answered "pass"; 4 of 82 harmless notes
flagged as crisis; name and hatch line 1.9 s, pack 3.7 s; lines regenerated on
18.8% of calls against a target under 10%.

### The work queue (design against code, 7 Oct)

Four read-only reviews compared the brief and the design boards (including
the design's own animation code) with the code, flow by flow. They are the
queue the fix lanes work from; a lane ticks an item by quoting its number.

- [What a person can reach](reports/261007-reachability-audit.md)
- [Day loop and care](reports/261007-design-vs-code-day-loop-and-care.md): 153
  items. First: a carried task that vanishes, "Carry on tomorrow" returning to
  the ask, the whole app waiting up to 25 s behind the model call, "Swap in"
  passing the daily limit, "Pick for me" with no way out, the crisis screen
  with no way to the helplines page, a heard deadline that never returns.
- [Characters, keeping and Plus](reports/261007-design-vs-code-characters-keeping-plus.md):
  no line boil, static poses, monsters with no life of their own, nothing
  reacting to touch, no transitions, five designed moods missing, sound silent
  with the ringer off, hold haptics that keep firing, inks that recolour
  nothing, Plus sold on a heavy day.
- [Tables, system surfaces and website](reports/261007-design-vs-code-tables-surfaces-website.md):
  the nine pieces two friends need to sit at a table and send one haunt, in
  order; no remote push; widgets and the Live Activity against the boards; the
  missing web-to-app hand-off.

Decided 7 Oct after these: a free person can join any table and open a table
of two; a larger table needs Plus.

### Next, in order

1. The founder's notes: the drawer, the dead taps, three a day (first
   over-the-air update), then the motion and feel pass across the app.
2. Walk everything under "Reachable but never walked" on the simulator and
   fix it, the serious and crisis screens first.
3. Make tables usable by one person with a friend: Sign in with Apple on the
   build, becoming friends inside the app, universal links, and decide
   whether opening a table really needs Plus.
4. Remote push: APNs key, token routes, sending for haunts, nudges and the
   Live Activity.
5. Plus for real: a sandbox purchase walked end to end, the webhook, inks
   applied, the weekly sentence.
6. Widgets, the Live Activity and notifications seen on a phone; the App Clip
   and the website hand-off.
7. The shared record video, the remaining not-built list, then production
   resources and phase 11.

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
| Native batch one | End of 01 | A TestFlight build is installed (7 Oct 2026); an over-the-air update has not yet reached it |
| First minute | End of 04 | Passed online 7 Oct 2026 on a device run and on the founder's iPhone; offline for the session is not yet walked |
| Care | End of 07 | The serious and crisis eval set passes with no miss, and the walk shows no joke on a heavy task |
| Money | End of 08 | On dev: sandbox purchase, trial, restore and cancel walked end to end; the house rules checked screen by screen |
| Release | End of 11 | prd is deployed and smoke-checked before submission. The full fresh-user walk on the release candidate is not required: the founder waived it on 8 Oct 2026 |

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
3. In progress 7 Oct: the dev ids exist (`app.scootch.dev` and its App Clip,
   widgets and notification service). EAS cannot sync an App Clip's
   capabilities, so they are ticked by hand; the main id still needs iCloud
   and a fresh provisioning profile. The production set is not made yet.
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

## Decided 7 Oct 2026

- Free Scootch is three things a day; the Plus number is open.
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

## Unresolved questions

0. How many things a day Plus allows, now that free is three (six for now).
1. Does a free user see the weekly sentence in the world, or is it Plus only.
2. "Send the link to my phone": QR code and email only, or text messages too.
3. Does the founder accept "a person writes back within two working days" on
   the support page.
4. The minimum iOS version (16.4 today; 18 is recommended).
5. Whether the crisis screen offers a way out into a quiet day.
6. Whether monsters made on the website can be sent as haunts.
7. Whether `help@`, `privacy@` and `press@scootch.app` exist.
