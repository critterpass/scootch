# The monsters get out: system surfaces, redrawn

Status: in progress · Created 8 Oct 2026 · Board:
[Scootch - System Surfaces v2](../../design/Scootch%20-%20System%20Surfaces%20v2.dc.html)
(25 screens, listed in `design/screens.json` under "System Surfaces v2").

The founder replaced the System Surfaces board with this one on 8 Oct 2026.
It takes the place of
[phase 06 of the full build](../261006-2350-scootch-full-build/phase-06-system-surfaces.md),
whose Swift was written and never run on a device. Read
[product-brief.md](../../docs/product-brief.md) sections 2, 4, 6 and 7 before
any task here.

## What replaces what

| Board | Replaces | Stays |
|---|---|---|
| The hunt: Lock Screen, Island, ten states | The Live Activity with the shrinking disc | Park and "I'm stuck" without unlocking; a fresh line at each attitude |
| Lurker, Lurkers, Shelf, Terrarium | Today small, medium, large and extra large; the world widget | The care rules in the snapshot; Dark, Clear and Tinted |
| Lock Screen accessories, StandBy nightlight | The three accessories, the StandBy view | StandBy is a Plus surface |
| Notifications from the monsters, three bites | The day's lines sent as Scootch | Limits per attitude, back-off, quiet hours |
| Ten app icons, the picker | The one icon | — |
| Settings · Look, wallpaper | — (new) | Settings is one page |
| Every way to start | The control and the Action button | Both intents |
| Share into a monster | — (new) | — |
| At a table: Lock Screen, Island, widgets, StandBy | — (new) | Friends only, labels never the task, silent nudges |

## Decided 8 Oct 2026 (founder)

| Decision | Choice |
|---|---|
| What a lurker is | A hatched thing only: today's thing and things carried to tomorrow. The drawer stays closed; a parked thing never lurks |
| Three bites | The task call writes three steps under five minutes. Ticking one shrinks the monster and earns nothing; the last one opens the catch in the app |
| Oldest iOS | 17.0. Controls, tinted icons and the Watch Smart Stack switch on at 18 |
| Share into a monster | At launch |
| Distraction shield, calendar warnings, arrive-home reminders | After launch |

## Decided by the build

| Board | Choice | Why |
|---|---|---|
| "When the time runs out the Island bursts and the Live Activity turns into the caught card" | Time running out shows overtime with "Finish", which opens the catch. The burst and the caught card follow the real catch | The brief: Scootch asks whether the thing was really done before the catch unlocks |
| "Tilting the phone moves the shine" on the Lock Screen | The caught card's shine is drawn still | A Live Activity cannot read motion |
| "Say it to Park" from the Lock Screen | Park opens the app on the park field, already listening | Recording from a locked phone needs the app in front |
| "Give me a first line", "Make it smaller" while stuck | The first line is one of the task call's lines, shown at once. "Make it smaller" opens the app on "too big" | Starting never depends on a server; shrinking is a call |
| A hunt started from a widget, Siri or a control with the app closed | A Swift intent writes the session into the App Group and starts the Live Activity; the app adopts it when next opened | The session must run with no JavaScript alive |
| "Tables now" with strangers by category | Friends' tables only | Strangers are after launch |
| Apple Watch | No watch app. The Live Activity is given a small layout for the Smart Stack; the five-minute tap is not built | iOS shows a Live Activity on the Watch by itself; a timed tap needs a watch app |
| "Refresh every morning" | A Shortcuts action "Today's Scootch wallpaper" and the steps to add the automation | An app cannot create an automation or set the wallpaper |
| Finish icons marked PLUS | An icon is worn by whoever may wear its finish | One rule for who wears a finish (`features/studio/rules.ts`) |
| "DAY 9", "3d" | Kept: it is how long the thing has waited, the same number the card carries. It is left off a serious task and nothing is shown on a crisis day | The task is the joke; the user's days are never counted |
| Back Tap, Focus on | A row in Settings that opens Shortcuts; a Focus filter with three switches | Both are set up in iOS, not in the app |
| Native batch | One batch with Plus Materials phase 07 | A build takes a runner; one fingerprint change, not two |

## Phases

Every phase is in the native batch branch `feat/system-surfaces-outside-the-app`,
stacked on Plus Materials. One commit per phase. Nothing lands on main until
the batch's build is the installed one.

| # | Phase | Needs |
|---|---|---|
| 01 | [What the surfaces are told](phase-01-what-the-surfaces-are-told.md) | — |
| 02 | [Three bites](phase-02-three-bites.md) | 01 |
| 03 | [The hunt](phase-03-the-hunt.md) | 01 |
| 04 | [Widgets that know what's lurking](phase-04-widgets.md) | 01 |
| 05 | [Notifications with a cast](phase-05-notifications.md) | 01, 02 |
| 06 | [The icon](phase-06-the-icon.md) | — |
| 07 | [Look and wallpaper](phase-07-look-and-wallpaper.md) | 06 |
| 08 | [Every way to start](phase-08-ways-to-start.md) | 03 |
| 09 | [Share into a monster](phase-09-share-into-a-monster.md) | 01 |
| 10 | [At a table](phase-10-at-a-table.md) | 03, 04 |
| 11 | [The batch, built and walked](phase-11-built-and-walked.md) | all |

## Done when

- A fresh user with no seed starts a hunt from the Lurkers widget with the app
  closed, sees the race on the Lock Screen and the Island, parks a thought,
  goes into overtime, finishes, and sees the caught card in the finish they
  wear, on an iOS device run.
- A notification arrives from the monster, its long-press shows three bites,
  and ticking the last one opens the catch.
- A serious task is on no widget as a monster, sends no monster's message and
  has no bites; a crisis day shows nothing of the day anywhere.
- The icon changes with the attitude, and the picker pins one.
- Sheets of every surface sit beside the board in both languages, Default,
  Dark, Clear and Tinted, and at the largest text size.
