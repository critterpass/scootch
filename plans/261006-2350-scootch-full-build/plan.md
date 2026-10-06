# Scootch full build

Status: not started · Created 6 Oct 2026 · Scope: everything in
[product-brief.md](../../docs/product-brief.md) sections 3 to 9. The
after-launch list (camera, gifts, iPhone Duo, monster wall, Unwrapped, Android
release, tables with strangers) is section 10 there and is not planned here.

Decided 6 Oct 2026: public repository at github.com/critterpass/scootch,
RevenueCat, English and Vietnamese at launch, tables for friends only.

Phases are ordered by dependency and sized by task count. No time estimates.

## Phases

| # | Phase | Tasks | Needs | Status |
|---|---|---|---|---|
| 00 | [Spikes and founder gates](phase-00-spikes-and-founder-gates.md) | 9 | — | not started |
| 01 | [Foundation and native shell](phase-01-foundation-and-native-shell.md) | 11 | 00 | not started |
| 02 | [Characters and sound](phase-02-characters-and-sound.md) | 8 | 01 | not started |
| 03 | [AI routes, API and ops bot](phase-03-ai-api-and-ops-bot.md) | 9 | 01 | not started |
| 04 | [The day loop](phase-04-day-loop.md) | 10 | 01 (art and routes arrive from 02, 03) | not started |
| 05 | [Keeping: cards, world, record, share](phase-05-keeping.md) | 8 | 02, 04 | not started |
| 06 | [System surfaces](phase-06-system-surfaces.md) | 7 | 02, 04 | not started |
| 07 | [Care, edge states and settings](phase-07-care-edge-and-settings.md) | 8 | 03, 04 | not started |
| 08 | [Plus](phase-08-plus.md) | 8 | 05 | not started |
| 09 | [Tables and haunting](phase-09-tables-and-haunting.md) | 8 | 03, 04 | not started |
| 10 | [Website and growth](phase-10-website-and-growth.md) | 8 | 02, 03 | not started |
| 11 | [Launch](phase-11-launch.md) | 7 | all | not started |

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
| Voice | End of 00 | The founder has read sample lines at all three attitudes and picked the model |
| Native batch one | End of 01 | A TestFlight build with every launch capability declared; an over-the-air update reaches it |
| First minute | End of 04 | A fresh install goes from "Hello" to a caught monster with no seed, on a device run, and offline for the session |
| Care | End of 07 | The serious and crisis eval set passes with no miss, and the walk shows no joke on a heavy task |
| Money | End of 08 | Sandbox purchase, trial, restore and cancel walked end to end; the house rules checked screen by screen |
| Release | End of 11 | The full fresh-user walk passes on the release build, with video |

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

1. Put scootch.app on Cloudflare (it is registered).
2. Create the EAS project (the GitHub repository exists).
3. Create the Apple app id and tick every capability in tech-decisions section 4.
4. Create the RevenueCat project and the three products.
5. Provide the AI provider key under a no-training agreement, and the Jev key.
6. Create the Telegram bot and send its token and your chat id.
7. Split "App flows" once more and split "Website"; both are still over the
   export limit.
8. Approve the voice (the Voice gate).

## Unresolved questions

1. Which generation model writes Scootch in each language (the phase 00
   bake-off decides).
2. Who checks the Vietnamese voice and the Vietnamese banned-word list. The
   founder is the obvious reader.
3. Does a free user see the weekly sentence in the world, or is it Plus only.
4. "App flows" (Settings and icon) and "Website" (sections 03 to 15) have not
   been reviewed, because both boards are still over the export limit.
