# Scootch full build

Status: built in code through phase 10, not yet seen running on a device ·
Updated 7 Oct 2026 · Created 6 Oct 2026 · Scope: everything in
[product-brief.md](../../docs/product-brief.md) sections 3 to 9. The
after-launch list (camera, gifts, iPhone Duo, monster wall, Unwrapped, Android
release, tables with strangers) is section 10 there and is not planned here.

Decided 6 Oct 2026: public repository at github.com/critterpass/scootch,
RevenueCat, English and Vietnamese at launch, tables for friends only.

Phases are ordered by dependency and sized by task count. No time estimates.

## Phases

| # | Phase | Tasks | Needs | Status |
|---|---|---|---|---|
| 00 | [Spikes and founder gates](phase-00-spikes-and-founder-gates.md) | 9 | — | done but one task (see the phase file) |
| 01 | [Foundation and native shell](phase-01-foundation-and-native-shell.md) | 11 | 00 | in progress: 5 done, 5 built and unproven; the first native build links but has not launched |
| 02 | [Characters and sound](phase-02-characters-and-sound.md) | 8 | 01 | built, unproven on a device (1 done, 5 partly) |
| 03 | [AI routes, API and ops bot](phase-03-ai-api-and-ops-bot.md) | 9 | 01 | in progress: 2 done, 4 partly; deployed on dev |
| 04 | [The day loop](phase-04-day-loop.md) | 10 | 01 (art and routes arrive from 02, 03) | built, unproven on a device (10 partly) |
| 05 | [Keeping: cards, world, record, share](phase-05-keeping.md) | 8 | 02, 04 | built, unproven on a device (7 partly); the shared record as a video is not built |
| 06 | [System surfaces](phase-06-system-surfaces.md) | 7 | 02, 04 | built, unproven on a device (7 partly) |
| 07 | [Care, edge states and settings](phase-07-care-edge-and-settings.md) | 8 | 03, 04 | built, unproven on a device (8 partly); helplines verified 7 Oct but two rows |
| 08 | [Plus](phase-08-plus.md) | 8 | 05 | built, unproven on a device (8 partly); the server does not enforce Plus yet |
| 09 | [Tables and haunting](phase-09-tables-and-haunting.md) | 8 | 03, 04 | built, unproven on a device (8 partly); deployed on dev |
| 10 | [Website and growth](phase-10-website-and-growth.md) | 8 | 02, 03 | in progress: 7 partly; deployed on dev; the shared record page has no data |
| 11 | [Launch](phase-11-launch.md) | 7 | all | not started |

## Where it stands (7 Oct 2026)

"Partly" in a phase file nearly always means the code and its tests exist and
nobody has seen it on a phone. Nothing in the app counts as done until the
fresh-user walk shows it.

- **Server, dev:** deployed and healthy at `scootch-dev`. Screening, the task
  call in stages, tables, haunts, accounts, sign-out, the public invite and
  haunt reads, card and story sharing with signed words, and the ops bot.
  Main deploys to dev from CI (`deploy-dev.yml`).
- **Website, dev:** deployed at `scootch-web-dev`. Home with the monster
  maker, Plus, the plain pages, verified helplines with opening hours, and the
  monster, card, story, invite, haunt and record pages.
- **App:** phases 04 to 09 are written, with character motion, share links,
  "Haunt a friend" on the hatch screen and RevenueCat keys per environment.
- **Native build:** two simulator builds linked badly and died at launch
  (prebuilt Expo frameworks that did not match the installed core). The Expo
  set is now one consistent release (`expo` 58.0.5, React Native 0.88 rc.3),
  an offline check (`tools/scripts/check-expo-prebuilds.sh`, a required CI
  job) proves the prebuilt frameworks link, and device runs keep crash
  reports. The third build is the first that may launch.
- **Measured:** crisis notes caught 67 of 67 with none answered "pass"; 4 of
  82 harmless notes flagged as crisis; name and hatch line 1.9 s, pack 3.7 s;
  lines regenerated on 18.8% of calls against a target under 10%.

### Next, in order

1. The third simulator build launches and the fresh-user walk runs with
   captures; fix what the first sight of the app shows.
2. The founder's dev build on an iPhone (ids, capabilities and profiles are
   being set up; hold until step 1 passes).
3. The RevenueCat webhook, so the server enforces Plus.
4. The shared record as a video, with its read route and clip.
5. Monster blink, the regeneration rate, the crisis day known to the server,
   signed rarity and spec on shared cards.
6. Production resources (D1, R2, secrets, domains) and phase 11.

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
| Native batch one | End of 01 | A TestFlight build on the dev channel with every launch capability declared; an over-the-air update reaches it |
| First minute | End of 04 | A fresh install goes from "Hello" to a caught monster with no seed, on a device run, and offline for the session |
| Care | End of 07 | The serious and crisis eval set passes with no miss, and the walk shows no joke on a heavy task |
| Money | End of 08 | On dev: sandbox purchase, trial, restore and cancel walked end to end; the house rules checked screen by screen |
| Release | End of 11 | The full fresh-user walk passes on the release candidate against dev, with video; then prd is deployed and smoke-checked before submission |

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

- The founder does not proof-read Vietnamese copy; the completeness and
  banned-word checks stand in.
- "Haunt a friend" is on the hatch screen only, not in the drawer.
- Sign-out unlinks the account and keeps the device's own token.
- The sender of a haunt may see "waiting" or "gone" through its link.
- A shared record is a video.
- Vietnam's helplines: 115 first, then Ngày mai and Hy Vọng Sống with their
  hours, and 111 as the children's line.

## Unresolved questions

1. Does a free user see the weekly sentence in the world, or is it Plus only.
2. "Send the link to my phone": QR code and email only, or text messages too.
3. Does the founder accept "a person writes back within two working days" on
   the support page.
4. Two helpline rows are unverified at their own source and block a
   production bundle: Tele-MANAS (India) and the hours of Hy Vọng Sống.
5. The minimum iOS version (16.4 today; 18 is recommended).
6. Whether to set up Sentry.
7. Whether the crisis screen offers a way out into a quiet day.
8. Whether monsters made on the website can be sent as haunts.
9. Whether `help@`, `privacy@` and `press@scootch.app` exist.
