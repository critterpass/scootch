**Scope read:** `docs/product-brief.md` (whole), `design/Scootch.dc.html`, `design/Scootch - Care and Edge States.dc.html`, section 01 of `design/Scootch - Monsters and Keepsakes.dc.html` (the hatch lives there, not on the main board), `design/fx.js` (whole), `design/critters.js` (motion, tap, audio parts), `design/screens.json`.
Code paths are relative to `apps/mobile/src/` unless they start with `packages/` or `design/`. Nothing was rendered or run; every finding is from reading.

## Cross-cutting (applies to every step)

1. [missing] Board script: every `[data-press]` scales to .95 in 140ms, then springs 1.02→1 over 420ms. Code: opacity change only (`ui/buttons.tsx:52,100`, `features/session/ui/controls.tsx:46,78,107,135`, `features/dump/dump-panels.tsx:182`).
2. [missing] Screen-to-screen transitions: the root is a bare `<Slot />` (`app/_layout.tsx:30`), so `/world`, `/settings`, `/session`, `/reveal`, `/care` swap with no animation or swipe-back. Exits are `router.replace` (`features/settings/settings-container.tsx:62`).
3. [missing] Stage-to-stage on the one screen: `OneScreenView` re-renders body and footer with no entering/exiting or layout animation (`features/one-screen/one-screen-view.tsx:219-264`). The only screen fade in the area is the session's 240ms `FadeIn` (`features/session/ui/session-frame.tsx:40`).
4. [missing] `critters.js:641`: tapping Scootch gives a squeak, haptic [8,60,12] and a 1.4s `celebrate` pop. Code: `ScootchSays` gets no `onPress` on the one screen (`one-screen-view.tsx:241`); only Hello wires the squeak (`features/launch/first-launch.tsx:78`), with no visual pop.
5. [missing] `critters.js:641`: tapping a monster gives 1.4s `nervous`, a growl chirp and haptic 14. Code: `art/Monster.tsx` has no press handler and no growl cue exists in `packages/sound/src/cues/`.
6. [missing] `critters.js:293`: every mood change plays a 0.5s squash-and-stretch. Code: a new mood "starts from its still" (`art/Scootch.tsx:136`); the squash exists only for a monster shrink (`packages/art/src/motion/entrances.ts:59-65`).
7. [missing] `critters.js:294,663-664`: eyes follow the pointer (and lean, when waiting). Code: only a seeded random glance (`packages/art/src/motion/scootch-idle.ts:47-60`).
8. [missing] Design moods `scheming, proud, dramatic, sulk, nudge, shocked` (`critters.js:80-89`) do not exist in `packages/art/src/scootch/moods/index.generated.ts` (11 moods). Screens that use them fall back to `pleased`, `waiting`, `stuck` or `working`.
9. [missing] Monster moods `nervous` (shake) and `caught` (eyes shut, zzz) (`critters.js:400-481`) have no equivalent: `Monster` takes only spec, idle and hatching (`art/Monster.tsx:33-48`). `monsterIdle` computes a blink that is never drawn (`art/Monster.tsx:91-95`).
10. [missing] Design cues `tick, listen, send, cancel, aww` and the task chirp (`critters.js` ScootchAudio) have no counterpart; `packages/sound/src/cues/index.generated.ts` has ten cues. The `hatch` cue is never played and `squeak` only on Hello.
11. [diverges] Characters tick at 12Hz with layer swaps (`art/motion-runner.ts:2`); the design draws at 30fps with a 3-frame line boil at 4fps (`critters.js:626,655`). `bargaining`, `serious` and `working` without a work mode have no own loop (`art/motion-plan.ts:45-54`).
12. [broken] Every store event is queued behind the previous one (`state/day-store.ts:108-112,317`), and `submitText` awaits the network call inside the queue (`state/task-flow.ts:57-60`, 25s timeout at `api/scootch-api.ts:23`). Drawer pull or close and settings changes do nothing until it returns.

## First launch

13. [missing] Hello: the design's tap gives squeak plus celebrate pop. Code: `celebrating` is a one-off 2.4s entrance (`features/launch/launch-views.tsx:34-38`); a tap plays sound and haptic only.
14. [diverges] Pick my attitude: the design has live 92px Scootches in `sleepy / scheming / dramatic`. Code: 64px stills in `asleep / waiting / stuck` (`features/launch/attitude-view.tsx:16-21,83`), with no selection animation or haptic.
15. [diverges] Permissions: the design shows both favours with one "Not now / Sure" pair. Code asks them one at a time, so two answers before any system prompt (`features/launch/launch-machine.ts:44-51`).
16. [diverges] First one thing ("first win in the first minute"): the first send is held for the battery question (`features/one-screen/one-screen.tsx:86-89`), then "That's the one", then "Catch him", then Start. That is five taps from chip to session.
17. [missing] No transition between Hello, attitude, permissions and the one screen (`features/launch/launch-page.tsx:48-60`); the step dots jump.
18. [polish] Scootch sizes on the board are 320 (Hello), 230 (permissions) and 270 (first thing). Code uses a fixed 260 (`ui/scootch-says.tsx:12`).

## One screen states

19. [missing] Brief §3 Morning ("fresh, specific line") and board map step 1 ("about yesterday's leftover"): `morningLine` is written `null` and never fetched (`state/day-store.ts:211`). The waiting line is the offline pack's (`one-screen.tsx:307`).
20. [missing] Waiting: fx.js says "Scootch reacts to each" (`say('listening'|'thinking'|'celebrate'|'nudge')`, fx.js:196,214,227,236,241). Code maps only phase to mood (`features/one-screen/composer-mood.ts:7-15`): no celebrate when the answer lands, no reaction to a cancel.
21. [diverges] Typing: the design switches Scootch from `listening` to `thinking` when text appears and back when it is emptied (fx.js:241). Code stays on `typing` whatever is in the field.
22. [polish] With the keyboard up Scootch jumps from 260 to 140 with no animation (`ui/scootch-says.tsx:41-45`).
23. [diverges] Task set: the board draws Scootch (200) with the monster (150) overlapping beside him. Code draws the monster only on a carried-over morning (`one-screen.tsx:200-211`); on a normal day it vanishes after "Catch him".
24. [diverges] Task set mood: design `waiting`; code `pleased` when a monster exists (`one-screen.tsx:183`).
25. [diverges] Done for today: the board's world row has an 84px live world thumbnail and "7 things live here now". Code draws the title and a chevron only (`features/one-screen/one-screen-panels.tsx:110-133`).
26. [diverges] Done line ("Done for today. Molar's in your world…"): code shows the finish line only while it is still in memory (`one-screen.tsx:142-146`); after a relaunch it is the generic offline line.
27. [missing] No shown-state for a slow first paint: a blank page until `ready` (`app/index.tsx:26`), then content appears with no entrance.
28. [polish] Unused copy: `session.doneForToday` and `morning.firstStep` (`packages/i18n/src/en.ts:17,315`) are referenced nowhere.

## Composer and brain dump

29. [missing] Send "fly" (fx.js:208-216): a tomato capsule or a glass pill with the typed text flies toward Scootch over 800ms and fades. Code: nothing; the dock just changes state.
30. [missing] Send, listen, cancel and tick sounds (fx.js:157-159,201,224,236,238). Code: one `Haptics.selectionAsync` when a recording starts (`one-screen.tsx:90-92`); no sound anywhere in the composer.
31. [missing] Haptic when cancel arms at −80 (fx.js:232). Code flips `armed` only (`features/composer/composer-view.tsx:138-141`).
32. [missing] Held dock scales to 1.025 (fx.js:226) and the live row follows the finger at `dx*.35` (fx.js:231). Code has neither.
33. [missing] A too-short hold shakes the capsule (fx.js:237). Code shows the hint only (`features/composer/composer-hints.tsx:51`).
34. [missing] Hint pill enters and leaves with opacity .3s, translateY 10, scale .96 (fx.js:167,188-189). Code mounts and unmounts it (`composer-hints.tsx:95-111`).
35. [missing] Send button grows in at scale 0→1 over .45s (fx.js:184,241). Code returns `null` and then appears (`features/composer/composer-field.tsx:49`).
36. [missing] Keyboard and wave icons crossfade and scale .6↔1 (fx.js:170-171,192-193), and talk and type layers crossfade (fx.js:194-195). Code swaps both instantly (`composer-view.tsx:201,205`).
37. [missing] Left button press scale .92 (fx.js:198). Code: none (`composer-view.tsx:192-202`).
38. [has] Capsule ink→tomato, left button fold, live 22-bar waveform, timer, "Release to cancel" and armed grey are implemented (`composer-view.tsx:52-75`, `features/composer/waveform.tsx`). Under Reduce Motion they crossfade.
39. [diverges] Listening: the board fades the newest words of the transcript to muted. Code draws the transcript in one ink (`one-screen-view.tsx:130-138`).
40. [diverges] First hold with the microphone unasked shows the system prompt and records nothing (`features/composer/composer-machine.ts:87-89`); the person must hold again, with no hint.
41. [diverges] Choosing reveal (fx.js:130-147): words arrive one by one at 100ms, then the others blur 3px, drift ±20px sideways and fall 120-280px. Code shows whole phrases as chips, with no blur and no sideways drift (`features/dump/reveal.tsx:56-106`).
42. [diverges] The reveal's answer rises 14px with overshoot easing (fx.js:124,144). Code cuts from `RevealView` to the `Headed` panel (`features/one-screen/stage-shown.tsx:131-153`).
43. [missing] No reveal for a typed task or an offline ramble (`reveal: null`, `state/task-flow.ts:70`, `state/task-answers.ts:100`); the one thing just appears.
44. [missing] The reveal cannot be skipped by a tap; it runs to `doneAt` (`reveal.tsx:128-132`).

## The one thing and energy

45. [missing] The one thing: the board has Scootch `celebrate` with a second sentence "The other eleven are in a drawer. I'm sitting on the drawer." Code: mood `pleased`, `line: null`, and no parked count anywhere (`stage-shown.tsx:125-141`).
46. [diverges] A typed single task still stops at "Today's one thing" with Another / That's the one (`task-flow.ts:70`, `stage-shown.tsx:154-170`), an extra confirmation of the person's own words.
47. [diverges] Deadline heard: the board's dock is "Peek in the drawer" + "That's the one". Code keeps "Another" in the dock and puts Peek as a text link in the body (`stage-shown.tsx:151,155-169`).
48. [missing] Brief §3 "brought back on its own day" and board "I'll bring it back on Thursday morning as the one thing": `morningOffer` returns `deadline_returns` (`packages/domain/src/day/morning.ts:65`) but nothing in the app reads it.
49. [missing] Board: "The deadline gets its own reminder." `state/day-notifications.ts` plans no notification from a drawer item's `returnOn` or `dueDate`.
50. [diverges] Energy read: the board has Scootch saying "Before I pick: how's the battery?" as his sentence. Code sets `line: null` and prints it as a heading under a "SCOOTCH" label (`dump-panels.tsx:148`).
51. [broken] Pick for me after "One more": `stageOf` returns the composer before it checks `picked_for_me` (`features/one-screen/one-screen-stage.ts:92-108`), so the "pick for me" chip does nothing visible.
52. [broken] Pick for me has no way out: only "Pick again" and "Fine, that one" (`stage-shown.tsx:91-118`). With one drawer item "Pick again" returns the same item (`state/pick-flow.ts:84-93`), and the state lasts until the app is killed.
53. [diverges] Pick for me: the board has Scootch `scheming` with a justifying line ("It's the smallest one and it's been sulking"). Code: `pleased`, `line: null`.
54. [diverges] Bargaining: the board's line is a written counter-offer ("Fine. Five minutes… Deal?"). Code reuses the task's `checkIn` line plus its `tinyNextStep` (`stage-shown.tsx:179,187`); there is no bargain call in `api/`.
55. [diverges] Bargaining is reached only through "Not now", then an inline field, then "I'm wiped / Say it" (`features/one-screen/not-now.tsx:25-72`). Once there, the only exits are Smaller or Deal, which starts the session.

## Drawer

Designed (main board, "Peek in the drawer") against `features/drawer/drawer-sheet.tsx`:

56. [diverges] Container: the board's sheet is a floating card inset 8px on three sides, top at 160px, radius 44 on all corners, 94% paper with blur 30. Code: an edge-to-edge bottom sheet, top radius 34, opaque page colour, `maxHeight: '86%'` (lines 152-159).
57. [missing] Grabber: 36×5, radius 3, `rgba(28,26,23,.2)`, centred at the top. Code has none.
58. [missing] Gestures: there is no drag-to-dismiss and no pan handler; it is a plain RN `Modal` (lines 36-41). The scrim is a `View`, not a `Pressable` (line 42), so tapping outside does nothing.
59. [diverges] Scrim: `animationType="slide"` on a transparent modal moves the 25% shade up with the sheet instead of fading it in.
60. [missing] Behind the sheet the board dims the one screen to 40% and switches Scootch to `scheming` at 200px above the sheet. Code leaves Scootch unchanged.
61. [diverges] Header: the board has the title (700 22px) left and "11 parked · 2 with dates" (500 13px) right on one baseline. Code stacks a 24px title over a 15px count (lines 49-65).
62. [diverges] Rows: the board has one white grouped card (radius 22) with hairline dividers, rows 12/14 padding. Code gives each row its own surface with radius, gap 2, min height 60 (lines 76-80,166-174).
63. [missing] Row leading mark: a 22px tomato "!" disc for dated items, a 22px outlined empty circle for undated. Code has no leading mark.
64. [diverges] Row type: board title 500 16px, sub 12.5px, "Swap in" pill 600 13px with 8/10 padding. Code: 17, 15, and a 44pt-high pill at 15 (lines 86-117,176-181).
65. [missing] Truncation: the board shows six rows then "+5 more. Anything without a date…". Code lists every item in a scroll view and has no "+N more" string.
66. [diverges] Empty state: code puts "Nothing is parked." in the count's place but still prints the fade note and Close (lines 61-63,122-127). No empty state is designed.
67. [missing] Serious items: a drawer item carrying `screen: 'serious'` is drawn like any other. Neither the brief nor the board specifies a treatment.
68. [missing] Row actions: only "Swap in". There is no let-go or remove on a row and no row press state. The board shows only Swap in too.
69. [broken] "Swap in" is offered on a finished day (`canSwap={task === null || …}`, `one-screen.tsx:129`). `swapItemIn` then writes a new set task and Start works with no `startsLeft` check (`pick-flow.ts:36-63`, `state/session-flow.ts:127-144`), bypassing one-a-day.
70. [diverges] Opening: any overscroll of 90pt or more on any one-screen stage opens it (`one-screen-view.tsx:236-238`), including with the keyboard up. The "Peek" link exists only on the one-thing stage (`stage-shown.tsx:69-76`).
71. [missing] No sound or haptic on open, close or swap. Swap closes the sheet and jumps straight to the hatch with no transition (`state/pick-events.ts:34-40`).

## Hatch and monster

72. [missing] The `hatch` cue (`packages/sound/src/cues/hatch.ts`) is never played: it is not a `SessionCue` and no screen calls it.
73. [diverges] The egg wobble and hatch pop play only if the monster was absent when the stage mounted (`features/monster/hatch-figure.tsx:41,75`). The name usually arrives during the one-thing step (`task-answers.ts:34-48`), so in the common path the monster is simply there.
74. [note] The boards design no egg or hatching state at all (Monsters board 01 has only "Hatched" and "Shrunk"). The code's egg is an undesigned plain oval (`hatch-figure.tsx:82-92`).
75. [diverges] Hatched: the board has Scootch `bargaining` (190), the monster at 180, and "Molar, Keeper of Thursday". Code: Scootch `waiting`, both figures at 150, name only with the title dropped (`stage-shown.tsx:215,221,228`).
76. [diverges] Shrunk: the board has Scootch `celebrate`, the monster `nervous`, and a line about the shrink ("He's the size of a grape"). Code: `pleased`, idle monster, and the unchanged flavour text (`stage-shown.tsx:226-229`).
77. [missing] Shrink sound: `too_big` on the one screen goes to `pick-flow.ts:127-135` directly. The reducer's `shrink` cue (`packages/domain/src/session/session-reducer.ts:110-116`) is never reached, and "Make it smaller" after a session plays none either.
78. [has] The shrink animation exists: ease-out to the new size plus a 0.5s squash (`art/Monster.tsx:112-137`).
79. [missing] Hatch entrance has no burst, sparkle or Scootch reaction; `HATCH_POP_SECONDS` 0.5 scale-in only.

## Task set and treat

80. [diverges] Treat: the board has a row "Treat after this | Coffee ›". Code has an inline right-aligned text input with placeholder "Name it" (`one-screen-panels.tsx:43-69`).
81. [diverges] Minutes: the board's segmented control is 36px high with the chosen pill white and shadowed. Code: 44pt segments, no shadow, no slide between segments (`one-screen-panels.tsx:70-104`).
82. [diverges] The board's Task set has only treat, minutes and Start. Code adds "Not now", "Something else" (carried) and table links under the choices (`one-screen.tsx:212-225`).
83. [missing] Start press: the design fires the burst from the Start button itself and relabels it "Started" (fx.js:58-65). Code leaves the route for a blank `starting` frame (`features/session/session-screen.tsx:30-34`), then a separate burst screen.
84. [diverges] Real-world treat: board eyebrow, then Scootch's ceremony line as the headline, then "Claim the coffee". Code makes the treat's name the headline and the line muted body (`features/session/screens/after-screens.tsx:100-110`).

## Session

85. [diverges] Start burst: the design fires 56 marks with 2 rings from the button plus 34 marks at 30% height 90ms later (fx.js:60-61). Code: one burst of 30 marks from a fixed [0.5, 0.36] (`features/session/ui/burst-shapes.ts:32`, `ui/burst-marks.tsx:87`).
86. [has] The start-burst cue and haptics play (`session-reducer.ts:67-73`). Under Reduce Motion the burst is a glow (`burst-marks.tsx:91-94`).
87. [diverges] Running: the board draws a paper-toned Scootch (200) on top of the tomato disc inside a 330 ring. Code stacks a disc of at most 280 or 24% of height, then a normal-toned Scootch of at most 140 below it (`features/session/screens/working-screen.tsx:23-25,195-211`).
88. [diverges] Disc size: the board's diameter is about linear in time (232/330 at 7 of 10 min, 92/330 at 2). Code uses the square root of the fraction (`features/session/session-view.ts:166-168`).
89. [missing] Disc "alive" pulse: an expanding 22px tomato halo every 3.2s (board script, `data-anim="disc"`). Code has none (`features/session/ui/time-disc.tsx`).
90. [diverges] Reduce Motion disc: Care board says it "steps down once a minute". Code steps every second (`time-disc.tsx:46-50`, `features/session/use-session-screen.ts:38`).
91. [diverges] Top-left: the board's "● Molar · 10 min" is a pressable glass pill. Code's `Tag` is a non-interactive view (`controls.tsx:57-65`).
92. [diverges] Footer: the board has only the glass "+ Park a thought". Code adds "I'm stuck" and "I'm done" text buttons (`working-screen.tsx:96-110`); brief §11 requires "I'm stuck".
93. [diverges] Two minutes left: the board has Scootch `shocked`, the warning line replacing the task text, and no Park button. Code ignores `twoMinutesLeft` in the view (`working-screen.tsx:134,146`); the cue and haptic do play (`packages/domain/src/session/session-clock.ts:63-71`).
94. [has] The working line turns every 90s (`use-session-screen.ts:26,105-112`) and the work-mode loop runs (`art/motion-plan.ts:58-60`).
95. [missing] No transition from burst to working beyond the frame's 240ms fade, and the disc has no entrance.

## Stuck / park / check-ins

96. [diverges] Thought parked: the board's glass toast drops from the Island (−36px, scale .9), holds, then tucks away, with a 30px tomato check disc. Code: a static surface block in the content flow for 2.6s, no icon (`working-screen.tsx:181-194`, `use-session-screen.ts:28`).
97. [diverges] Thought parked mood: design `nudge`; code `pleased` (`working-screen.tsx:146`). The cue plays but no haptic (`session-reducer.ts:126`).
98. [diverges] Park entry: the board says "One tap and a few words". Code opens a card with an autofocus field and "Never mind / Park it" (`features/session/ui/park-composer.tsx`), with no open or close animation. No voice.
99. [diverges] Stuck card: the board's is glass, radius 36, step at 650 24px. Code: a plain surface, radius `lg`, step in the `action` face (`features/session/ui/stuck-card.tsx:25,35-42`). The card and the disc resize with no animation (`working-screen.tsx:137-140`).
100. [has] The timed check-in at half-way (sessions of 10 min or more) opens the same card with a nudge cue (`session-clock.ts:74-79`). "Smaller" walks the tinier steps (`session-flow.ts:32-45`).
101. [missing] "Okay" on the stuck card gives no reaction from Scootch and no sound; the card disappears (`session-reducer.ts:142-143`).

## Finishing

102. [broken] Hold haptics: `hold-rising` taps are all scheduled up front with `setTimeout` and never cancelled (`effects/native-adapters.ts:100-108`). After an early release the remaining taps and the final pop at 1700ms still fire; `stop_cue` only pauses audio (`effects/effects-runner.ts:102-103`).
103. [diverges] Hold sound: the design drives pitch, tempo and filter from live progress (`critters.js` `hold().set(p)`, fx.js:94-95). Code plays a fixed 1.7s render from 0 on every press (`packages/sound/src/cues/hold-rising.ts:14`), so a re-press mid-drain is out of step with the ring.
104. [missing] Early-release sound (falling marimba plus "aww", `critters.js` `hold().release`; `sigh`, fx.js:13,111). Code has no cue; only the line `releasedEarly` (`session-reducer.ts:155-160`).
105. [missing] Hold button shake (`sin(now/22)*e*1.6`) and progressive scale `.96−e*.02` (fx.js:90-92). Code: a static .96 while pressed (`features/session/ui/hold-button.tsx:63`).
106. [diverges] Hold label turns white once the fill passes 55% (fx.js:91). Code's label stays ink over the tomato fill (`hold-button.tsx:82`).
107. [has] Ring and centre fill, 1.7s fill and 0.45s drain, the 8% "nearly" threshold and the three captions match (`features/session/hold-control.ts:6-9`). "Nearly" never reverts to idle, where the design reverts after 1800ms (fx.js:111).
108. [missing] The catch: the design fires 80 marks with 3 rings from the button plus 40 at 30% height, the label becomes "Done", Scootch celebrates for 3.2s and the monster goes `caught` (fx.js:101-108). Code goes to a blank `reveal` view then `/reveal` (`session-view.ts:96`, `session-screen.tsx:30-34`, `use-session-screen.ts:87-89`).
109. [missing] Confetti at the finish: `BurstMarks kind="confetti"` is drawn only on the no-reveal moment screen and on the treat screen (`after-screens.tsx:28,72`). A normal catch with no treat named shows no confetti.
110. [diverges] Hold screen characters: design Scootch `listening`, monster `nervous`; released early Scootch `bargaining`. Code: `waiting` or `thinking`, monster idle (`features/session/screens/finish-screen.tsx:118`).
111. [missing] Brief §3 and Care board "Say 'done'": `voiceFinishTrigger` is `null` (`features/session/voice-finish-trigger.ts:17`), so choosing it in Settings gives the tap-twice control.
112. [has] Tap twice with a 4s confirm window, the VoiceOver activate path and the quiet plain tap exist (`hold-control.ts:11,81-89`, `working-screen.tsx:70-77`).
113. [diverges] Not finished: design Scootch `nudge` with corner buttons. Code: `pleased`, no corner buttons, rows with opacity press only (`features/session/screens/not-finished-screen.tsx:45,68-74`).

## After the finish and done-for-today

114. [diverges] Card reveal: the board flips with overshoot (180° at .86 scale → −14° at 1.05 → 6° → 0), the glow swells .6→1.3→1.1, and a "CAUGHT" stamp thumps in. Code: a 700ms flat rotation, glow as opacity ×.22, no scale and no animated stamp (`features/reveal/reveal-screen.tsx:30,41-58`).
115. [missing] No sound or haptic on the card flip or any reveal step; the `finish` cue has already played at the hold.
116. [diverges] New world piece: the board has the live world with Scootch `proud`, a popping "+1 to your world" eyebrow and a line ("Molar is home…"). Code: one static world row, a static eyebrow and the monster's name only (`reveal-screen.tsx:160-174`).
117. [diverges] Song bar: the board has Scootch `proud` (200) and a line above the record. Code has neither, and `BarStrip progress={0}` never moves (`features/reveal/reveal-later-steps.tsx:39-67`).
118. [missing] Surprise drop: the board shows Scootch wearing the beret, a named item and a line. Code: "outfits are not drawn yet", a generic title, and "Wear it" only records the wish (`reveal-later-steps.tsx:73-116`).
119. [missing] Reveal steps swap with no transition (`features/reveal/ui/keep-frame.tsx` has no animation). "Rare drop" and "+1" eyebrow pops (board `data-anim="pop"`) are absent.
120. [diverges] Parked thoughts: design Scootch `proud` with "Two thoughts. I kept them warm." Code: `pleased`, with a line only if the task's pack has one (`features/session/screens/parked-thoughts-screen.tsx:44,54-58`). Rows vanish on choice with no animation.
121. [broken] "Carry on tomorrow" moves the task to tomorrow (`session-flow.ts:112`). Today then has no tasks and day status is still `open`, so the app returns to "What's the one thing today?" with a start available (`packages/domain/src/day/today-state.ts:65-68`).
122. [missing] `done_for_today` has a handler (`day-store.ts:262-266`) but nothing dispatches it. Nothing lets the person end the day without finishing.
123. [note] "One more" is a locked quiet control for free users and opens the Plus sheet on tap (`features/plus/one-more.tsx:23-34`), consistent with brief §7.

## Mornings and returns

124. [broken] A carried task is shown only if the app is opened on exactly the next Scootch day: `refresh` reads `tasks.where('localDate', today)` (`day-store.ts:132`). Opened later, the task and its monster are in neither today nor the drawer.
125. [broken] The same applies to any task set or left early yesterday: there is no rollover step in `rebuild` (`day-store.ts:193-233`); `DrawerEvent 'day_rolled_over'` is never sent.
126. [diverges] Carried over: the board has a "Today's first step" card and the line "Molar slept over. He's shrunk a bit…". Code shows the task's old hatch line and the task text; `morning.firstStep` is unused (`one-screen.tsx:175,191-192`).
127. [has] Carried monster drawn one size down, "Something else" to the drawer, and "Start · N min" exist (`one-screen-stage.ts:82-84`, `pick-flow.ts:138-145`).
128. [diverges] Back after a while and after a month: chips are ways in, such as "just sit with me". Code submits the chip's label as a typed task (`features/one-screen/composer-ways.ts:43`, `one-screen.tsx:269-273`), so it goes through the battery question, then the pick and the hatch.
129. [diverges] Back after a while: the board has Scootch `celebrate` with the beret, his own news, and "Your world is exactly as you left it." Code: mood `waiting`, the ordinary waiting line, no second sentence.
130. [diverges] Back after a month: the board has Scootch `sleepy`, its own line, different chips ("two minutes of anything") and no composer. Code uses one `smallest_ask` state for 7 or more days with the same three chips and the composer (`morning.ts:6,61-63`, `one-screen-stage.ts:16-20`).
131. [has] No count of days away is stored or shown (`morning.ts:17-31`); the notification back-off is planned 14 days ahead (`day-notifications.ts:36,108-121`).

## Serious

132. [diverges] Serious screen: the tiny-step row starts the quiet session, the same action as "Sit with me quietly" (`features/care/serious-shown.tsx:35-39,54`). The board shows it as its own row with a chevron.
133. [has] No monster, reveal, burst, card or share; a reminder row; "Not today" to the drawer and a quiet day; "It's fine, be funny" (`one-screen-stage.ts:123-125`, `serious-shown.tsx`, `state/care-flow.ts:126-143`).
134. [diverges] Quiet session: the board has a back control top-left and a paper Scootch (`sleepy`) on the ink-grey disc. Code: a close X top-right, Scootch `serious` below the disc (`working-screen.tsx:159-177,204`).
135. [diverges] Care board: "no Live Activity theatre". Code starts a Live Activity for every tone (`session-reducer.ts:64`), with a plain line.
136. [has] Quiet finish plays `quiet-finish`, no confetti, and a plain Done screen (`packages/domain/src/session/session-endings.ts:38-44`, `after-screens.tsx:20-60`).

## Crisis

137. [missing] Board: a control in the top corner of the crisis screen. Code's crisis screen has no corner control and no route out (`features/care/crisis-view.tsx:56-150`, `one-screen.tsx:111-114`), so Settings and its helplines page cannot be reached that day.
138. [diverges] "Just sit with me" is local component state (`features/care/crisis-screen.tsx:28`). It only swaps the title and resets on relaunch; Scootch stays still.
139. [has] Tasks hidden and all non-passive events dropped; the phone's gate checks every typed field; regional helplines ordered by open hours; a helplines row in Settings (`day-store.ts:237`, `care-flow.ts:77-94`, `features/settings/settings-page.tsx:219-224`).
140. [diverges] A crisis day ends only when the app is foregrounded on a new day (`day-store.ts:300-303`); left open overnight it stays.

## Offline and failures

141. [missing] "Offline · still starts": the board has rows "Carry on: Email the dentist — From yesterday ›" and "Type something new ›" above "Start · 10 min". Code shows the composer with the offline line and pill only (`one-screen.tsx:307`, `features/one-screen/one-screen-corners.tsx:36-49`).
142. [missing] "AI unavailable": the board has a composer state with chips "from yesterday / something tiny / just sit with me" and a primary "Type the one thing". Code sets `modelDown` only after a failed call, by which time the text is already the offered one thing (`task-flow.ts:66-70`).
143. [diverges] A slow model: the person watches "Scootch is picking the one thing…" for up to 25s with no cancel (`api/scootch-api.ts:23`, `composer-hints.tsx:49`).
144. [has] An offline session runs on local timers with "Your monster will hatch when we're back online"; pending tasks are re-asked on reconnect (`state/lines.ts:87-88`, `task-flow.ts:127-163`).
145. [missing] No error state when `dispatch` rejects: every call site swallows it (`one-screen.tsx:79`, `use-session-screen.ts:61`).

## Settings

146. [broken] "Invite a friend" is an inert row at half opacity that announces "Not open yet" (`settings-page.tsx:179-186`). The board shows it as a live row.
147. [diverges] Attitude dial: the board has live 78px Scootches in `sleepy / scheming / dramatic`. Code: 72px stills in `asleep / waiting / stuck` (`settings-page.tsx:17-21,90-95`).
148. [missing] No haptic or animation on a switch or attitude change; rows press by opacity (`features/settings/rows.tsx:158`).
149. [note] Finish with offers Say "done" (`settings-page.tsx:22-26`) with nothing behind it (item 111).
150. [has] Per brief §11: "Sit with strangers" is left out; Language, Plus and Helplines are added.

## Brief or design with no code; brief with no design

151. Brief + design, no code: the fresh morning line (19); a deadline returning on its day and its reminder (48, 49); say "done" (111); a drawn surprise outfit (118).
152. Design, no code: the catch moment on the hold screen (108); the composer fly (29); the offline carry-on rows (141); the AI-unavailable composer state (142); a distinct month-away state (130); drawer grabber and gestures (57, 58).
153. Brief, no design: what a serious item looks like in the drawer (67); what "Letting go" shows (code simply returns to the composer); what happens to an unfinished, uncarried task the next day (125).

## Where the design and the brief disagree

- Stuck help: the board says "nothing has moved for a while"; brief §11 says a timed check-in plus an "I'm stuck" button. The code follows the brief.
- Start: the board's day map says "One tap"; the Task set note and the brief say two taps.
- Serious detection: the Care board says "on the device… before anything else runs"; brief §6 says the phone catches only explicit phrases and the server screens.
- Settings: the board has "Sit with strangers"; the brief leaves it out.
- Within the design: the dump's second line differs between the board ("The other eleven are in a drawer. I'm sitting on the drawer.") and `fx.js:125` ("Eleven other things are parked. You won't see them unless you ask.").

## The ten gaps that most hurt the first five minutes

1. Nothing responds to touch beyond opacity: no press scale, and no squeak or pop when Scootch or the monster is tapped (1, 4, 5).
2. No transitions anywhere: stages and routes cut, with blank frames at start and at finish (2, 3, 83, 108).
3. The catch is missing: a full hold gives no burst, no "Done", no celebrating Scootch or caught monster, and often no confetti (108, 109).
4. The hold feels wrong: haptics keep firing after letting go, sound restarts from zero, no shake, no "aww" (102-106).
5. The composer is silent and static: no send fly, no sounds, no celebrate when the answer lands (20, 29-37).
6. The first win is five taps from the chip, starting with the battery question (16).
7. The hatch has no moment: no sound, usually no pop, and the monster disappears on Task set (72, 73, 23).
8. The drawer: no grabber, no drag or tap-outside dismiss, shade slides with the sheet, layout unlike the board, opens on any overscroll (56-65, 70).
9. Dead ends and wrong exits: Pick for me with one item; "pick for me" after One more; "Carry on tomorrow" returning to the ask; inert Invite row (51, 52, 121, 146).
10. Scootch does not act the scene: six moods missing, no mood-change squash, no gaze, wrong moods on most designed states (6-8).

## Could not determine

- Whether the drawer's `Modal` has a further runtime fault (layout under `maxHeight`, safe-area inside the modal, pull reliability via `onScrollEndDrag` on short content). This needs a device.
- Whether a bare `<Slot />` gives any native transition in this Expo Router version; I read it as none.
- How items look when rendered: `design/renders/` is not in the checkout and nothing was run.
- Server-written copy, in particular whether `checkIn` reads as a bargain and whether the hatch line arrives before the hatch stage.
- Whether on-device speech works offline for English and Vietnamese (`features/composer/speech.ts` was not traced).
- Whether `expo-glass-effect` is available on the founder's device or the fallback fill is drawn.
- Audio latency of `expo-audio` for the start burst relative to the visual.
- `noticePickUp`, the surface actions, the table strip and the haunt links were not traced.