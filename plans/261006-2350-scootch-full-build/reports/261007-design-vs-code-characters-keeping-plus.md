Roots used below: `M` = `apps/mobile/src`, `P` = `packages`, `D` = `design`. Everything is from reading at c83cd27; nothing was run. Hz figures are my conversions of the design's `sin(k·t)` terms.

## 1. Character motion

### Whole-character motion in the design

| What | Design (`D/critters.js`) | Computed in `P/art`? | Rendered in the app? |
|---|---|---|---|
| Line boil (every character, monster, world) | Pen jitter reseeded `floor(t*4)%3`: 3 frames at 4 fps (`Critter.draw`) | No. `Pen` takes a fixed seed (`P/art/src/core/pen.ts:16-25`) | No, anywhere |
| Breath | `sin(2t)`, height ±1.4% (`emo`) | Yes (`scootch-idle.ts:14`) | Yes, as a Skia scale stepped at 12 Hz (`M/art/Scootch.tsx:143-146`) |
| Blink | Every 3.7 s for 0.12 s, round eyes | Yes, plus doubles | One 83 ms frame at most, can be skipped; never while working, where the 24-frame loop leaves no room (`M/art/motion-plan.ts:76`) |
| Gaze follows pointer | 7 moods, eased 0.18 per frame, decays 0.9 (`GAZE`, `draw`) | No. Replaced by a random glance (`scootch-idle.ts:47-60`) | Glance as a two-pose swap, only for loops of 6 frames or fewer (`motion-plan.ts:77`) |
| Squash on mood or mode change | 0.5 s damped sine, height −13%, width +9% (`scootch`, `o.since`) | Only for a monster shrink (`entrances.ts:59`) | No. A mood change is an instant frame swap |
| Tap reaction | Scootch: celebrate 1.4 s + chirp. Monster: nervous 1.4 s + grumble + buzz (`pointerdown`) | No | Only Hello plays a squeak (`M/features/launch/first-launch.tsx:78`). The one-screen Scootch has no `onPress` (`one-screen-view.tsx:241`); monsters are never tappable |
| Antenna tip, body outline wobble | `sin(2.3t)`, phase `t*.9` | Tip tied to breath only (`expression.ts:135`) | Inside the breath scale only |

### Moods

Rates are the design's; "pose static" means the mood file takes no time input. The stuck, pleased and asleep mood files (`P/art/src/scootch/moods/*.ts`) read no beat.

| Mood (design → code) | Design's motion | Computed? | Rendered / where |
|---|---|---|---|
| waiting | Lean `sin(.5t)`·2.5, hand taps `abs(sin 5t)`, dots 1.6/s | Dots only (4 frames per 2.5 s); pose static (`moods/waiting.ts`) | One screen, hatch figure, Plus sheet, finish screen: breath, dots, blink, glance |
| listening | Bob `sin(2.4t)`, waves 1.6/s | Waves only (6 frames) | One screen |
| thinking | Bubbles fade `sin(3t)` | Yes (8 frames) | One screen, hold screen, trial last day; no glance |
| bargaining | Tremble `sin(22t)`, lean `sin(1.2t)` | No loop (`mood-loops.ts:9-25`) | One screen, permissions: breath and blink only |
| working (plain) | Hands type `sin(16t)`, alternating | No | Working screen with no mode: breath only |
| stuck | Eyes dart `sin(3.1t)`, hands tremble `sin(9t)`, shiver `sin(30t)`, drop bobs | Drop only | Working screen |
| celebrate → celebrating | Jump `abs(sin 5.5t)`·22 with landing squash, arms wave `sin(11t)`, 18 confetti | Jump as `sin(π·beat)`, no landing squash, no arm wave (`moods/celebrating.ts`); 6 frames | Burst, after screens, drop step, trial started, Hello |
| proud → pleased | Bob `sin(3t)`, pulse `sin(6t)`, star eyes rotate and pulse, 4 stars | Stars only | Shrunk, parked thoughts, not finished, first offer (56 pt), restore |
| sleepy → asleep | Breath `sin(1.2t)`, rock `sin(.6t)`, zzz 0.45/s | Zzz only | Done for today, renewal off |
| scheming | Eyes flick, hands rub `sin(6t)`, glint | Mood does not exist (`P/domain/src/contracts/art.ts:46-58`) | Never. Design uses it on the card back, first offer, settings Cheeky |
| dramatic | Sway, wail, tears 1.1/s | Does not exist | Never. Design: Unhinged Plus sheet, settings Unhinged |
| sulk | Slump, rain cloud | Does not exist | Never |
| nudge | Hand waves `sin(9t)`, stars | Does not exist | Never. Design: thought parked, cancel, Soft sheet |
| shocked | Jitter `sin(40t)` | Does not exist | Never |
| typing, serious (code only) | Not in design | typing: dots; serious: breath only | One screen; quiet session |

Also missing as options: `hat` (beret), `tone="paper"` and the dark palette. `P/art/src/scootch/palette.ts` has one palette.

### Work modes

All 30 have a loop in `P/art/src/motion/work-loops-*.ts`, each "at or under the design's" speed. They render only at `M/features/session/screens/working-screen.tsx:204`: 24 frames per 4–9 s loop (about 3–6 drawings a second), with no blink or glance. At tables the loop is off (`ownLoop={false}`, `M/features/table/seat.tsx:72`, `table-strip.tsx:48`). The design also shows modes animated on record credit rows and the Characters classifier; the app shows them nowhere else.

| Mode | Design motion | Code loop |
|---|---|---|
| email | Envelopes 0.55/s; typing hands 2.5 Hz (from the working base) | fly 0.5/s; no typing track |
| writing | Hand 0.54 Hz, page fills 0.25/s | 0.5 Hz, 0.25/s |
| reading | Page turn 0.3/s, nod 0.24 Hz | 0.2/s, 0.2 Hz |
| studying | Scan 0.41 Hz, highlight 0.4/s, drop 0.48 Hz | 0.4, 0.4, 0.4 |
| coding | Braces 0.3/s; typing hands | rise 0.25/s; no typing track |
| calling | Mouth 2.5/s, hand 0.48 Hz, lean 0.13 Hz, rings 1.6/s | 0.375/s, 0.375 Hz, 0.125 Hz, 0.375/s |
| texting | Thumbs 2.2 Hz, bubbles 0.45/s | 0.75 Hz, 0.25/s |
| money | Finger 3/s, receipts 0.3/s | 0.75/s, 0.25/s |
| paperwork | Stamp 1.1/s with squint, grin, impact lines | 0.75/s |
| research | Glass and eyes 0.19 Hz | 0.167 Hz |
| meeting | Nod 0.48 Hz, mouth 1/s, wave 22% of 5 s with fast wiggle | 0.4 Hz, 0.6/s, one eased window |
| presenting | Bars grow per 5 s, mouth 2/s, pointer 0.32 Hz | per 5 s, 0.6/s, 0.2 Hz |
| designing | Brush 0.8 and 0.48 Hz, canvas fills in 8.3 s | 0.33 Hz, 9 s |
| music | Sway 0.32 Hz, body bounce 1.3/s, hands 1.9/s, notes 0.4/s | 0.25 Hz, no bounce track, 0.75 and 0.5/s, 0.25/s |
| cleaning | Sponge 1.1/s, suds 0.6/s | 0.75/s, 0.5/s |
| dusting | Flick 0.95 Hz, puffs 0.7/s, sneeze every 5.5 s | 0.5 Hz, 0.5/s, every 6 s |
| laundry | Fold 0.25 Hz | 0.25 Hz |
| dishes | Sponge 0.95/s, suds 0.5/s, glint | 0.75/s, 0.5/s, glint |
| cooking | Stir 0.64/s, steam 0.5/s | 0.5/s, 0.5/s |
| groceries | Steps 1.9/s, rock 0.48 Hz | 0.75/s, 0.25 Hz |
| decluttering | Toss 0.55/s | 0.5/s |
| parcel | Tape every 2 s | every 2 s |
| diy | Hammer 1.4/s, blink on hit, sparks | 0.75/s |
| plants | Leaves 0.32 Hz, drops 1.2/s | 0.25 Hz, 0.75/s |
| pets | Brush 0.64 Hz, tail 1.27 Hz, hearts 0.5/s | 0.5 Hz, 0.75 Hz, 0.5/s |
| exercise | Jump 2.9/s, arms 1.43 Hz, sweat 1.2/s | stride 0.75 Hz, sweat 0.75/s |
| stretch | Bend 0.175 Hz, sparkles 0.25/s | 0.167 Hz, 0.167/s |
| selfcare | Breath 0.19 Hz, steam 0.6/s | 0.167 Hz, 0.5/s |
| trip | Eyes 0.175 Hz, pin hop 1.27/s | 0.167 Hz, 0.5/s |
| rest | Breath 0.19 Hz, zzz 0.45/s, steam 0.4/s | 0.167 Hz, steam 0.5/s, no zzz track |

### Monsters

| Motion | Design (`monster`, `ARCH`) | Computed? | Rendered? |
|---|---|---|---|
| Idle bob | `sin(2t)`·2; hover `sin(1.8t)`·4 | Yes (`monster-idle.ts:14-15`) | Yes, where `idle` is set: hatch figure and session `Characters` only |
| Hop (sock, note) | `abs(sin 3t)`·7 | No | No |
| Eyes drift, stalks sway | `sin(.7t)`, `sin(2t)` | No. `sin(.7t)` is reused as a body lean the design does not have (`monster-idle.ts:16-18`) | Lean rendered (`M/art/Monster.tsx:134`) |
| Blink | Shared eye code | Yes (`monster-idle.ts:31-36`) | No. Only bob and sway are read (`Monster.tsx:91-95`) |
| Per-body life | Phone rings, slime drips, pot lid rattles and steams, clock bells shake `sin(30t)`, beetle legs `sin(8t)`, bolt nut turns, weed leaves, note flag, box flaps, dust motes, bubble dots | No. Frame is built with `t: 0` (`P/art/src/core/build-monster.ts:53`) | No |
| nervous | Shake `sin(40t)`, darting wide eyes, wobble mouth, sweat. Shown at hold-to-finish and when shrunk | No. `monsterMoodSchema` exists (`P/domain/src/contracts/art.ts:142`) but `buildMonster(spec, sizeFactor)` takes no mood | No |
| caught | Eyes shut, smile, legs tucked, slow bob, drifting z. Shown in the world, cover art and after the catch | No | No |
| Hatch pop, shrink squash, egg wobble | Not in `critters.js` | Yes (`entrances.ts`) | Yes (`Monster.tsx:104-138`, `M/features/monster/hatch-figure.tsx:43-59`) |

### Screens that show a character

- **Animated:** one screen in all stages (`M/ui/scootch-says.tsx:51`, `hatch-figure.tsx:63-79`), Hello and permissions, restore offer, the session screens, reveal drop step (`reveal-later-steps.tsx:102`), Plus sheet (`plus-sheet.tsx:74`), trial started / last day / renewal off (`moments.tsx:26`), first offer (`first-offer.tsx:39`).
- **Animated, idle only:** table seat and strip (`ownLoop={false}`).
- **Still with no rule behind it:**
  - zoo tiles (`zoo-screen.tsx:159`, `idle` unset)
  - record credit rows (`record-screen.tsx:58`)
  - haunt monster (`haunt-pages.tsx:162`)
  - the monster and Scootch printed on every card (`P/art/src/card/build-card.ts:157,262`)
  - the whole world, the record label, and the reveal's piece and bar steps
  - settings attitude cards (`settings-page.tsx:89-93`), launch attitude picker (`attitude-view.tsx:80-84`), privacy (`privacy-page.tsx:148`), account (`account-page.tsx:34`): all hard-coded `reducedMotion`
- **Still by rule:** crisis view (`crisis-view.tsx:63-67`), serious (breath only, `motion-plan.ts:72`), Reduce Motion, registry captures.
- **No character where the design has one:** manage, shelf, lifetime moment, reveal card back, song-bar step, world, record sleeve.

### Conditions that can switch motion off

1. Settings Motion defaults to `'full'` (`M/data/repositories/settings.ts:16`), so it does not wrongly still anything.
2. [diverges] Motion "calm" is read only by session (`use-session-screen.ts:153`), reveal (`reveal-container.tsx:141`), record (`record-container.tsx:53`) and haptics (`state/day-store.ts:81`). `useScreenStyle` ignores it (`M/ui/use-screen-style.ts:40`), so the one screen, hatch, Plus and tables keep moving with Motion off.
3. Reduce Motion comes from Reanimated's `useReducedMotion` (`Scootch.tsx:91`, `Monster.tsx:82`); correct by reading.
4. `useForcedVariant()` is `undefined` outside the registry (`forced-variant.tsx:37`), so it is not a cause.
5. Focus: `useIsFocused` from expo-router under a root `<Slot />` (`M/art/use-motion-ticks.ts:20`, `M/app/_layout.tsx:30`). If it reported false, every character would be still. Not determinable by reading.
6. App state: the first read is `AppState.currentState === 'active'` (`use-motion-ticks.ts:8`). It recovers on the next change event; characters freeze under any system alert or Apple sheet.
7. `Monster` idle defaults to off (`Monster.tsx:75`).
8. A character shows its rest frame until all frames are built (`Scootch.tsx:111-121`).

By reading, nothing forces everything still on a normal phone. The flatness comes from what is animated: floating effects swapped at 12 Hz over static poses and a 1.4% breath.

## 2. Sound and haptics

Cues that exist (`P/sound/src/cues/`): `start-burst`, `hold-rising`, `finish`, `quiet-finish`, `park-a-thought`, `shrink`, `nudge`, `two-minutes-left`, `squeak`, `hatch`.

1. [diverges] Brief §3 wants the start to land "with a burst of sound"; `setAudioModeAsync({ playsInSilentMode: false })` (`M/app/_layout.tsx:17`) makes every cue and the record silent with the ringer switch off.
2. [missing] `hatch` is never played: it is not in `SessionCue` (`P/domain/src/session/session-types.ts:107-115`) and no screen calls it.
3. [missing] `squeak` plays only on Hello (`first-launch.tsx:78`). `ScootchSays` advertises a squeak hint (`scootch-says.tsx:79`), but the one screen passes no `onPress`.
4. [missing] Monster tap grumble (`chirp('task')`: saw growl, marimba, buzz 14) has no cue and no tap target.
5. [missing] Composer sounds `tick`, `listen`, `send`, `cancel` (`ScootchAudio` in `critters.js`, `SComposer` in `fx.js`) have no cues. The only feedback is `Haptics.selectionAsync` (`M/features/one-screen/one-screen.tsx:91`).
6. [missing] The early-release "aww" (`hold().release`: two falling marimba notes and a falling voice) has no cue. Release only pauses the audio (`session-reducer.ts:157`).
7. [broken] Hold haptics are scheduled up front with `setTimeout` and cannot be cancelled (`M/effects/native-adapters.ts:100-108`). After an early release the taps, including the final 40 ms pop (`hold-rising.ts:126`), keep firing.
8. [diverges] The design's hold sound follows progress, and the ring drains at 0.45 s (`SHold.tick`). The app plays a fixed 1.7 s render from zero on every press (`native-adapters.ts:62`).
9. [missing] `shrink` and `park-a-thought` play sound with no `haptic` effect (`session-reducer.ts:113,126`), though both cues define taps.
10. [missing] The shrink cue fires only from the session's `set` phase (`session-reducer.ts:110-113`). I did not trace whether the one-screen "Too big" passes through it.
11. [missing] Buttons: the design scales 0.95 → 1.02 → 1 over 140 ms and 420 ms (Keepsakes board script, `[data-press]`). `CapsuleButton` and `RoundButton` only change opacity and have no haptic (`M/ui/buttons.tsx:52,100`).
12. [missing] No cue or haptic anywhere in reveal, zoo, world, record, share, shelf or Plus: card flip, stamp, piece landing, surprise drop, finish change, purchase success, trial start, lifetime, record play (the design buzzes 10 in `SRecord.play`).
13. [polish] Haptics map to three impact styles only (`native-adapters.ts:93-97`); the cue's `sharpness` is dropped.
14. [diverges] A table nudge is haptic only (`M/state/together-context.tsx:70`).
15. The daily bar plays by itself on the reveal's bar step when Music is on (`reveal-container.tsx:110-118`), and the week track plays on the record screen (`use-record-playback.ts:45-61`). Both are subject to item 1.
16. [diverges] While playing, the design shows "Now: Tue · Bassline joins" (`SRecord.play`). The app's band line is static (`record-screen.tsx:173-175`).

## 3. Keeping

**Reveal**
1. [diverges] The design flip is 180° at scale 0.86 → −14° at 1.05 → 6° → 0, eased `cubic-bezier(.45,0,.2,1)` (`[data-anim="flip"]`). The app is one 700 ms `withTiming` with no scale or overshoot (`M/features/reveal/reveal-screen.tsx:40-57`).
2. [diverges] The design glow scales 0.6 → 1.3 and fades. The app's is a flat disc rising to 0.22 opacity that stays (`reveal-screen.tsx:58,78-80`).
3. [missing] The CAUGHT stamp thumps down after the flip (`[data-anim="stamp2"]`). In the app it is baked into the card (`build-card.ts:285`).
4. [diverges] The design back has an ink frame, dotted tomato, scheming Scootch in a circle and "WILD TASK CARD". The app back is a tomato rectangle with two lines of text at a fixed 250×350 (`reveal-screen.tsx:203-212`) against a front up to 330 wide, so the size jumps mid-flip.
5. [diverges] The design card tilts in 3D to the pointer and sways when idle (±5° and ±9°) with foil and glare following (`[data-tilt]`). The app moves only the foil, from gravity, by re-composing the whole card on the JS thread every 120 ms in 0.1 steps (`ui/card-view.tsx:46-66`). No 3D tilt, sway or drag.
6. [missing] "+1 to your world" pops in, with the whole world, Scootch proud and his line (`New world piece`). The app shows one static piece on a patch, the eyebrow and the monster's name; no line, no Scootch, no landing motion (`reveal-screen.tsx:124-176`).
7. [missing] "Song bar added" has Scootch and a line. The app has neither, and its bar strip is fixed at `progress={0}` (`reveal-later-steps.tsx:67`).
8. [missing] The surprise drop names the item, shows Scootch wearing it and has a line. The app has generic copy and a hatless Scootch; "Wear it" only stores the wish (`reveal-later-steps.tsx:73-116`).
9. [polish] While the finish is read back the reveal is an empty unstyled view. After 4 s it leaves with no reveal at all (`reveal-container.tsx:37,99-103,132`).
10. [polish] Steps replace each other with no transition; the root layout is a bare `<Slot />` (`M/app/_layout.tsx:30`).

**Card**
11. Fields match the design: name, kind · rarity, number, task pill, lurked, dread pips, catch time, flavour, caught-by date, scootch.app (`P/domain/src/contracts/art.ts:164-183`, `build-card.ts`).
12. [diverges] Rarity changes only the label (`build-card.ts:137`). The design counts "3 rare foils" and shimmers rare tiles (`The binder · Plus`, `[data-shimmer]`); every app card gets the same foil.
13. [missing] The card's monster and proud Scootch are live in the design (`Caught card · live`); in the app they are static drawings.
14. Five finishes exist (`P/art/src/card/finishes/`), and the picker stores the choice on the monster (`M/features/zoo/zoo-container.tsx:59-66`).

**World**
15. [diverges] The design is one island that widens and rescales in stages (0.34, 0.24, 0.17, 0.13) with Scootch in the middle, sleeping monsters, flags, rocks and houses, all boiling (`world`). The app is a scrolling grid of static canvases with no Scootch and no motion (`M/features/world/world-screen.tsx:87-124`).
16. [missing] The subtitle carries age ("Day 1 · one thing lives here", "Week 1 · 8 things"); the app shows the count only (`world-screen.tsx:63`).
17. [missing] Scootch's sentence under the world ("Molar moved in today…") has no element.
18. [missing] Pieces are not tappable; a monster's card cannot be opened from the world.
19. [missing] The Done-for-today world row has a live thumbnail and "7 things live here now" in the design; the app row is a title and chevron (`M/features/one-screen/one-screen-panels.tsx:110-131`).

**Zoo and binder**
20. [missing] The "All / Rare / This week" segmented control is absent; there is one cycling sort button (`zoo-screen.tsx:116-133`).
21. [diverges] Design tiles are mini cards with a dotted panel, holo shimmer and live monsters. App tiles are bordered boxes with still monsters (`zoo-screen.tsx:156-167`).
22. [diverges] The opened card uses the flat `CardView`, so the foil never moves in the zoo (`zoo-screen.tsx:74`).
23. [diverges] The design dock has "Sort" and "Share a card"; the app's has sort only, with share inside an opened card.
24. [polish] World, zoo and record move with `router.replace` (`world-container.tsx:22-24`, `zoo-container.tsx:54`, `record-container.tsx:58`), so there is no back gesture between them.

**Record**
25. [missing] The week's name and liner note are written by nothing. The `week.record_name` contract exists (`P/domain/src/contracts/ai-small-routes.ts:158-185`) but has no API route (`apps/api/src/routes/`) and no app caller, so the title is always "Week N" (`record-screen.tsx:171`).
26. [missing] Credit rows show Scootch in that task's work mode; the app shows a still monster (`record-screen.tsx:58`).
27. [diverges] A lit row scales 1.02 with a bouncing EQ (`onDay`); the app tints the row (`record-screen.tsx:55`).
28. [diverges] The design label has Scootch playing music on paper tone; the app prints still monsters in a row (`record-disc.ts:48-57`).
29. [missing] Subtitle duration ("7 bars · 0:14"), the liner quote card with Scootch, and "Produced by Scootch…" are absent.
30. [missing] The Cover art screen (past weeks as sleeves) has no screen; the shelf is a text list.
31. [polish] Playback progress ticks at 100 ms through React state (`use-record-playback.ts:19,55-59`).

**Sharing**
32. [missing] "Story · now playing" (dark story with a spinning record) does not exist; the week is shared as a bare WAV (`M/features/share/share-flow.ts:212-221`).
33. Panel states exist: preview, hide-task switch, save, share, take page down, seven notices (`share-panel.tsx:43-51`). Panel and preview are static with no transition.
34. [polish] The reveal's "Show someone" swaps the whole reveal for the panel (`reveal-container.tsx:131`).

## 4. Plus

1. [diverges] The sheet's Scootch changes by attitude (bargaining, nudge, dramatic) with a small sleepy one in the wordmark. The app always uses `waiting` (`M/features/plus/plus-sheet.tsx:74-79`).
2. [missing] Trial "the day before" notification has "Keep Plus" and "Cancel trial" actions; the app schedules a body-only notification (`M/effects/native-adapters.ts:113-119`). Same for the renewal reminder's two actions.
3. [diverges] The last-day screen is reachable only through Manage → Change plan on that day (`manage-container.tsx:46-47`).
4. [missing] Manage has a proud Scootch in the design; the app has none (`manage-screen.tsx:65-120`). The "Gift Plus" row is absent, consistent with the brief's scope.
5. [diverges] The lifetime card shows Scootch with the beret and the world with the lighthouse; the app shows a recoloured card and a 56 pt lighthouse (`lifetime-moment.tsx:40-95`). "It glows on bad days" has no code.
6. [missing] The shelf has ink entries only (`M/features/shelf/catalogue.ts:42-75`); Outfits and Worlds are empty, so their tabs are hidden (`shelf-screen.tsx:58`).
7. [missing] "Worn live by Scootch before you buy": the preview is a coloured blob and two bars (`shelf-screen.tsx:113-125`).
8. [broken] The chosen ink is written to memory and read back only by the shelf (`shelf-container.tsx:39,60`). It recolours nothing, yet is sold as recolouring "the app, your cards and the widgets".
9. [diverges] The shelf is reachable only from Manage (`manage-container.tsx:59`).
10. [missing] The record shelf is inert text rows: no cover, playback or "Export full track" (`record-shelf.tsx:42-51`). No export exists anywhere.
11. [diverges] "Never sold near heavy things" is applied to One more (`one-screen.tsx:148`), the first offer (`offer-rules.ts:54`) and Scootch's line (`state/lines.ts:122`) only. The zoo, record and finish locks still open the sheet with plans and a buy button on a heavy day (`zoo-container.tsx:58`, `record-container.tsx:60`, `sheet-container.tsx:19-60`).
12. [missing] The weekly sentence ("This week, honestly") and "the Scootch that learns you": contract only (`ai-small-routes.ts:126-156`), no route, caller, stats or element. The brief's monthly-for-free rule is unimplemented.
13. [diverges] The first offer sits in the world screen's footer with a `pleased` Scootch (`world-screen.tsx:69`, `first-offer.tsx:39-44`); the design puts it inside the world with `scheming`.
14. [polish] One more matches the design in its three states (`one-more.tsx`); no motion or feedback when it unlocks.
15. [polish] Purchase success goes straight to the next route (`sheet-container.tsx:34-39`) with no sound, haptic or transition.
16. Camera free try, friend pass and gift screens have no code; the brief puts camera and gifts after launch.

## 5. Ideas with no design and no code; designs with no code

1. [missing] Brief §5 "cover written by the AI": the design has cover art; code has neither the name nor a generated cover.
2. [missing] Brief §7 "keeping and exporting records": keeping exists, exporting does not.
3. [missing] Brief §5 surprise drops "such as an outfit": the drop is stored, but no outfit exists to wear or draw.
4. [missing] Brief §9 "every shared … record clip has its own page": the clip is a local audio file with no page.
5. [missing] Five designed moods (scheming, dramatic, sulk, nudge, shocked), the beret, paper and dark tones, monster nervous and caught, line boil, tap reactions and the mood-change squash have no code.
6. [missing] Screen-level motion in the board scripts has no code: screens rise in (900 ms, 70 ms stagger), eyebrows pop (`[data-anim="pop"]`), stamp thump, press spring.
7. `D/support.js` is the design-canvas runtime and holds no character or effect spec; only `critters.js`, `fx.js` and the board scripts do.

## The ten gaps that most reduce the feeling of a living, premium app

1. No line boil: every drawing is one frozen stroke set (`pen.ts:16`).
2. Mood poses are static; only floating effects move, at 12 Hz, on a 1.4% breath.
3. Monsters have no nervous or caught state and none of their own body motion; they are still everywhere except hatch and session.
4. No reaction to touch: Scootch and monsters are not tappable, and buttons have no spring or haptic.
5. Routes swap with no transition under a bare `<Slot />`, including every reveal step.
6. The card reveal is a plain 700 ms turn onto a text-only back, with no overshoot, stamp thump, sound or haptic, and a stepped foil.
7. The world is a static grid without Scootch, sleeping monsters, growth stages or a sentence.
8. Sound is silent on a muted phone, and `hatch`, the squeak, the composer sounds and the release sigh are unplayed or absent.
9. Five designed moods and the beret do not exist, so the Plus sheet, first offer, settings and card back lose their intended characters.
10. Plus cosmetics do nothing: inks recolour nothing, outfits and worlds are empty, and the record has no name, cover or export.

## Could not determine

- Whether `useIsFocused` reports true under the root `<Slot />` on device (item 5 under conditions).
- Whether Reanimated's Reduce Motion value updates while the app is running.
- Whether the one-screen "Too big" path triggers the `shrink` cue.
- Whether held-out work-mode poses (meeting wave wiggle, sneeze jump, hammer blink) are drawn; I read `calling.ts` only, and the loop tables for the rest.
- How the session's burst and hold ring look (`M/features/session/ui/burst-marks.tsx`, `hold-button.tsx`); I checked only their cues.
- The Website, Tables, System Surfaces and Care boards, beyond counting which moods they use.