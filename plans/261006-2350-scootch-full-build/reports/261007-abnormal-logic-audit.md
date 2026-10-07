Read-only audit of `/Volumes/CPLanes/scootch-worktrees/api-model-gateway` at `f974e25`. Nothing was run; every finding is from reading the code.

Path shorthand: `M/` = `apps/mobile/src/`, `D/` = `packages/domain/src/`.

## Findings, worst first

1. **[data loss] First launch on a new or reinstalled phone → the old backup is overwritten and restore is never offered.**
   - `rebuild` writes today's day row before `ready` (`M/state/day-store.ts:159-167`), and the restore gate only mounts after `ready` (`M/app/index.tsx:26-33`).
   - `findRestore` and `restoreSnapshot` both require zero day rows (`M/features/backup/backup.ts:102-104`, `M/features/backup/snapshot.ts:78-85,182`), so the offer can never show.
   - `keepUp()` runs right after `start()` (`M/state/day-store-provider.tsx:167-173`, `M/state/data-tools.ts:49-53`); the database is no longer "fresh", so `upload()` PUTs the near-empty snapshot under the synced token (`backup.ts:75-88,97-100`).
   - Person: never sees "bring my world back", and the server copy is replaced within seconds (unless the server keeps versions).

2. **[dead end] Done for today → "One more" (`one-more`) → type or speak → send: composer frozen for good.**
   - The first send of a day with no energy stored is held for the battery question (`M/features/one-screen/one-screen.tsx:96-99`).
   - `energyNeeded` is true whenever the day has no energy and no task rows (`M/state/day-refresh.ts:68`). That is the case after "Carry on tomorrow" or "That's it for today" on a carried-over morning.
   - On a done day `stageOf` returns the composer and never reads `energyAsked` (`M/features/one-screen/one-screen-stage.ts:118-125,127-128`), so the question never appears.
   - The composer has already cleared the text and sits in `sending` (`M/features/composer/composer-machine.ts:173-179`, `composer-view.tsx:49`); there is no Cancel because `taskCall` is idle.
   - Person: words vanish, nothing can be tapped until relaunch, and it repeats on the next try.
   - Same held-text trap: with the battery question up, pull the drawer and Swap in. `held` is never cleared (`one-screen.tsx:85,104-110`).

3. **[double action] Double-tap Start (`one-action`), Deal (`bargain-deal`) or "Sit with me" (`serious-sit`) → session restarts; a later X or "Make it smaller" loops.**
   - Each tap sends `session_set` then `started` (`M/features/one-screen/task-set-shown.tsx:52-55`); nothing debounces.
   - The one screen keeps its last element pressable while the session route arrives (`one-screen.tsx:61-63`).
   - `setSession` has no phase guard and replaces a running session with a fresh `set` one (`M/state/session-flow.ts:158-175`, `M/state/pick-flow.ts:128-137`).
   - The second `started` writes a second session row and overwrites `sessionRowId` (`session-flow.ts:64-82`); the first row stays open.
   - Person at once: burst and cue twice, timer reset.
   - Later: X or "Make it smaller" closes only row 2 (`session-flow.ts:92-104`). Today still reads `in_session` (`D/day/today-state.ts:70-82`) with no session in memory, so the one screen pushes `/session` (`one-screen.tsx:129-132`) and `/session` dismisses (`M/app/session.tsx:23-30`), over and over.
   - After relaunch the session they left is restored from the orphan row (`session-flow.ts:222-225`).

4. **[data loss] Ramble sent, model slower than 8 s or offline → the whole ramble becomes "the one thing", cut at 280 characters; the other things are never parked.**
   - Patience is 8 s (`M/state/task-flow.ts:33`); the fallback stores `offer.text.slice(0, 280)` as the task (`task-flow.ts:106-112`).
   - The later re-ask sends that text and, for an existing task, skips parking and deadlines (`M/state/task-answers.ts:165-181`; `task-flow.ts:210-234`).
   - "Another" (`one-thing-another`) offline or slow: the offered task is deleted and replaced by the raw ramble (`task-flow.ts:157-166`).

5. **[data loss] Parked thoughts vanish in four ways.**
   - Session X: `leaveEarly` emits no hand-over (`D/session/session-endings.ts:50-65`).
   - Skip (`session-thoughts-skip`) or Done (`session-thoughts-done`) without choosing only sets a local flag (`M/features/session/use-session-screen.ts:182`); `closeSession` then clears them (`M/state/session-moments.ts:38-48`).
   - App killed between the finish and the thoughts screen, which sits behind up to four reveal steps and the treat: only an open session's thoughts are re-read (`session-flow.ts:222-228`).
   - Day rollover and crisis.
   - Unresolved rows stay in the table and no screen reads them; the comment "simply still there" (`M/features/session/screens/parked-thoughts-screen.tsx:13-14`) is false for the person.

6. **[destructive] "Let it go" (`session-let-go`) → one tap, no confirm.**
   - Deletes the task, monster, all its sessions and thought rows (`session-endings.ts:80-86`, `session-flow.ts:115-117`, `M/data/repositories.ts:29-37`).
   - Time worked is discarded and the start is returned (`D/day/today-state.ts:41-58`), so let-go gives unlimited starts per day.

7. **[destructive] A running session is ended when the app comes forward after 04:00, or after flying east.**
   - `day_turned` skips a running session (`M/state/day-store.ts:255-263`), but `app_foregrounded` rebuilds regardless (`265-268`).
   - `openDay` closes the open row as `left_early` and carries the task (`M/state/day-rollover.ts:15-25,75`); the zone rule is `D/day/scootch-day.ts:34-37`.
   - `rebuild` never cancels the runner's timers or the Live Activity (`day-store.ts:145-184`; `M/effects/effects-runner.ts:82-85` runs only on `cancel_timer`).
   - Person: a 03:55 session, a phone call, back at 04:02 → pre-start screen "from yesterday", Live Activity still counting.

8. **[destructive] "Not finished" (`session-not-finished`) → one tap, cannot be taken back.**
   - Stored at once (`session-flow.ts:191-193,209-213`); from `not_finished` no finish event is accepted (`D/session/session-reducer.ts:103,161-168`).
   - It sits directly under the hold button (`M/features/session/screens/finish-screen.tsx:105-112`).
   - Person: a mis-tap leaves only carry, smaller or let go; the catch for that sitting is gone.

9. **[destructive] "That's it for today" (`rest-today`), a quiet link directly under "Not now" → one tap.**
   - Task moves to tomorrow and the day is marked done (`task-set-shown.tsx:94-99`; `session-flow.ts:127-133,139-150`).
   - No undo: the task is not in the drawer and cannot be brought back today.

10. **[lost state] World corner (`world-button`) then Close → a second one screen is created.**
    - Close is `router.replace('/')` over the existing index (`M/features/world/world-container.tsx:83`).
    - The new instance has fresh local state (`one-screen.tsx:82-85`; `M/features/composer/use-composer.ts:38`).
    - Person: typed text, the held first words at the battery question, treat and minutes are gone; the brain-dump reveal replays.
    - Same pattern in the Plus moments, account and friend-link closes (`M/features/plus/moment-containers.tsx:40`, `M/features/account/account-container.tsx:50`).

11. **[dead end] After session X or "Make it smaller", the task is `started`.**
    - "Not now" still opens, but `counterOffer` returns silently (`pick-flow.ts:21-24,110-112`).
    - The drawer shows no "Swap in" and no reason: `canSwap` is false and the cap note only shows with no task (`one-screen.tsx:147-152`).
    - Person: the task cannot be changed today except by finishing it or resting the day.

12. **[dead end] "Today's one thing" has no way back to edit the words.**
    - Only Another / That's the one / Peek (`M/features/one-screen/stage-shown.tsx:172-188`); `pick_dropped` covers only the pick and the bargain (`M/state/pick-events.ts:46-51`).
    - A mis-heard ramble cannot be retyped. The hidden escape is Another then Cancel while thinking; offline there is none.

13. **[wrong result] Catch time includes idle time.**
    - Finish stamps `endedAt = now` (`session-endings.ts:17-27,46`); "Not finished" stamps the tap time (`68-70`); minutes are the sum of sittings (`D/rarity/card-stats.ts:51-57`, `M/state/finish-earnings.ts:38-43`).
    - Person: a 10-minute session left on the time-up screen for three hours prints about 190 minutes on the card.
    - The restore and rollover paths cap at `endsAt` instead (`session-flow.ts:247`, `day-rollover.ts:19-23`).

14. **[wrong result] A task finished before the server answered never gets its monster, although Scootch says it will.**
    - The line "Your monster will hatch when we're back online" (`M/state/lines.ts:105-110`).
    - `fetchPending` needs a current task (`task-flow.ts:193-194`); a finished task is not one.
    - The finish writes a plain piece and no card (`finish-earnings.ts:69,80-85`); a late answer writes an uncaught monster nobody sees (`task-answers.ts:86-92`).

15. **[data loss] A recogniser error mid-ramble discards everything heard.**
    - `recognition_failed: nothing` resets the transcript (`composer-machine.ts:157-160`), while the normal end falls back to it (`104-106`); every unlisted error maps to `nothing` (`M/features/composer/speech.ts:99-109`).
    - Conversely, a recogniser `end` while the finger is still down sends the partial ramble (`composer-machine.ts:154-156`, `speech.ts:110-115`).

16. **[wrong result] "Not now" counter-offer.**
    - It always starts from 10 minutes (`pick-flow.ts:18,110-118`; `M/state/smaller.ts:23-27`).
    - On a back-after-a-while morning the ask is 2 minutes (`task-set-shown.tsx:50-51`) and the counter is "Deal · 5 min".
    - With 50 chosen it drops straight to 5.
    - Return key on an empty field submits "I'm wiped" (`M/features/one-screen/not-now.tsx:47`).

17. **[inconsistent] Three ways a task goes to the drawer.**
    - Swap in parks the shrunk text and deletes the monster (`D/drawer/drawer-items.ts:170-183`; `pick-flow.ts:54`). After "Too big" the real wording is gone from view (`smaller.ts:53-55`).
    - "Something else" (`something-else`) parks the original text, deletes monster and sessions, and resets first-mentioned to today (`pick-flow.ts:151-157`; `drawer-items.ts:62-72`). Days lurked, rarity and earlier sittings restart.
    - Rollover parks the task whole and keeps everything (`day-rollover.ts:29-47`).

18. **[wrong result] "Tomorrow" on a parked thought (`session-thought-N-tomorrow`).**
    - It becomes an undated drawer item that fades in 14 days (`session-flow.ts:276-285`; `drawer-items.ts:70`). Nothing happens tomorrow.

19. **[lost state] Treat and minutes are per screen, not per task (`one-screen.tsx:82-83`).**
    - The treat typed for task 1 is still in the field and is handed over again after task 2; both are lost on relaunch.

20. **[silent failure] Swap in from the drawer while Scootch is thinking.**
    - `dropTaskCall` discards the sent words with no `returnedText` (`pick-events.ts:34-41`; `task-flow.ts:120-125`), even when the swap itself is then refused.

21. **[lost state] App killed after the finish.**
    - "Reveal seen" is a module-level set (`M/features/reveal/reveal-seen.ts:5`) and the reveal position is React state (`M/features/reveal/reveal-container.tsx:55`).
    - Person: card flip, world piece, bar, drop and treat screens never show.
    - X on the drop step leaves its choice null with no other place to answer (`M/features/reveal/reveal-steps.ts:58-65`).
    - If the rows are not read back in 4 s the reveal is skipped and marked seen (`reveal-container.tsx:37,102-106`).

22. **[wrong time] Time up and two-minutes-left make no sound with the phone locked.**
    - They are JS timers only (`effects-runner.ts:71-80`); on return they are deliberately silent (`D/session/session-clock.ts:40,50-51,65`).
    - No local notification is planned for a session's end (`M/state/day-notifications.ts:67-121`).

23. **[late event] A Control Center or Action button "start" up to 30 minutes old fires on the next open.**
    - `M/features/surfaces/pending-actions.ts:15,57`; `M/features/surfaces/surface-sync.ts:105-110`.
    - It starts a fixed 10-minute session with no treat, skips "That's the one" and the hatch, and spends a start (`M/state/surface-actions.ts:26-34`).
    - It then replaces whatever route is on top (`M/features/surfaces/surface-sync-host.tsx:32`).

24. **[silent failure] Offline session, connection returns, server rejects the text.**
    - Session ended without a word and task, monster and sessions deleted (`task-answers.ts:117-126,149`; `M/state/care-flow.ts:40-61`).
    - A `crisis` verdict does the same and locks the day (`task-answers.ts:145-148`).

25. **[silent failure] Trial's last day: "Switch to monthly" and "Stop".**
    - Both only open Apple's sheet (`moment-containers.tsx:68-71`). If it fails to open or is closed unchanged, the app goes home with no word (`M/features/plus/apple-sheet.ts:17-27`).
    - Person believes it is done; the yearly charge still happens.

26. **[wrong time] One serious ramble flags every thing parked from it as serious.**
    - `task-answers.ts:166-169`.
    - While any such item is in the drawer `heavyToday` is true (`day-refresh.ts:57-58`): notifications forced soft (`day-notifications.ts:77-79`) and Plus lines and offers hidden (`M/state/shows-comedy.ts:48-51`).
    - A dated one never fades (`drawer-items.ts:70,105`), so this can last indefinitely. Each item is quiet-path when swapped in.

27. **[wrong time] Today's task nudges are anchored to the usual start, not to now.**
    - `day-notifications.ts:88-104`; `D/back-off/notification-plan.ts:127-134`; past times are skipped (`effects-runner.ts:177`).
    - A task set about 90 minutes after the usual start gets no nudge that day.

28. **[wrong time] "Delete everything" leaves things behind.**
    - `storage_replaced` rebuilds and re-plans 14 days of nudges for the now-empty app (`M/features/privacy/privacy-container.tsx:77-83`; `day-store.ts:243-244`; `day-notifications.ts:106-119`).
    - Charge reminders and the keychain list of shared pages are untouched (`M/features/privacy/data/delete-everything.ts:44-56`).

29. **[dead control] Start is silently refused with no start left.**
    - `session-flow.ts:185-187`.
    - Reachable when Plus or a trial lapses mid-day with a set task (`day-store.ts:230-231`; `M/state/plus-store.ts:119-128`). The button is never drawn disabled (`M/features/one-screen/one-screen-view.tsx:205-210`).

30. **[silent failure] Hold and tap-twice latch `finished` locally.**
    - `M/features/session/hold-control.ts:52,76-79,85-87`. If the store refuses or throws (`session-reducer.ts:161-162`; swallowed at `use-session-screen.ts:61`) the control is dead until the screen remounts.
    - `applySession` publishes the new session before writing it (`session-flow.ts:190,194`), so a failed write shows "finished" and a relaunch shows it running.

31. **[inconsistent] The same X glyph (`M/features/session/ui/controls.tsx:70-85`) means four things.**
    - End the session (`session-leave`, `M/features/session/screens/working-screen.tsx:171-177`).
    - Keep going, harmless (`session-keep-going`, `finish-screen.tsx:60-66`).
    - Skip the treat (`after-screens.tsx:74-80`).
    - Skip and drop all parked thoughts (`parked-thoughts-screen.tsx:24-30`).

32. **[lost state] A day turn skipped because a session was running is never retried.**
    - `day-store.ts:258-261`; `M/state/day-watch.ts:18-21` re-arms for the next day.
    - Person: after finishing at 04:10 the app stays on yesterday until it is backgrounded; a "One more" task is dated yesterday.

33. **[lost state] 04:00 with the app open on the composer.**
    - `rebuild` sets `ready: false` (`day-store.ts:177`) and Home unmounts the one screen (`M/app/index.tsx:26`).
    - Typed text, the held ramble, the offered pick and the bargain are gone.

34. **[wrong result] Serious "Remind me at {time}".**
    - The label is computed at render (`M/features/care/serious-shown.tsx:40-43,52`); the time is set at tap (`care-flow.ts:114-123`).
    - Left open across the quarter-to mark, it sets the following hour. Inside quiet hours at tap time it sets nothing, silently (`care-flow.ts:121`).

35. **[double action] Chips submit.**
    - `sendChip` replaces whatever is typed and sends at once (`one-screen.tsx:255-259`); typed text is lost.

36. **[counting] Smaller errors.**
    - Carried-over count is 0 or 1 however many times (`finish-earnings.ts:55-56`); a swap resets it (`pick-flow.ts:60`).
    - "Make it smaller" restarts a full-length session at whatever length is still selected (`session-endings.ts:104-111`; `one-screen.tsx:82`).
    - Stuck-card "Smaller" steps are lost on relaunch (`session-flow.ts:231-238`).

37. **[inconsistent] Two tasks can land on one day.**
    - "Carry on tomorrow" for A, then "One more" and "That's it for today" for B.
    - Tomorrow shows only the oldest (`today-state.ts:73-76`) and "waiting for tomorrow" names one (`day-refresh.ts:65-66`); B appears straight after A's finish in place of done-for-today.

## Held only in memory

| What | Where | Background | Relaunch | Day boundary |
|---|---|---|---|---|
| Composer text, mode, live transcript | `use-composer.ts:38` | kept (recording may end and send, or error and drop) | lost | lost (33) |
| First words held for the battery question | `one-screen.tsx:85` | kept | lost | lost |
| Sent words while thinking (`offer`, `taskCall`) | `day-types.ts:226-254` | kept | lost; nothing set | lost |
| Pick step: offered, reveal, picked-for-me, hatching, bargain | `day-types.ts:121-132` | kept | task simply set; hatch and accept skipped | lost |
| Heard deadlines card | `DayState.heardDeadlines` | kept | lost (item stays in drawer) | lost |
| `oneMore` flag | `day-store.ts:222-228` | kept | back to done screen | lost |
| Treat field, chosen minutes, reveal-played | `one-screen.tsx:82-84` | kept | lost | lost |
| "Not now" field | `not-now.tsx:21-22` | kept | lost | lost |
| Stuck card open, `stepShrinks`, hold in progress | `LiveSession` | hold dropped (`session-reducer.ts:87-91`) | card closed, steps reset | session ended (7) |
| Park-a-thought text being typed | `park-composer.tsx:24` | kept | lost | lost; also lost at time-up |
| Finishing-early, burst/moment/treat/thoughts passed | `use-session-screen.ts:56` | kept | reset | reset |
| Line, burst, treat hand-over, parked thoughts, after-lines | `DayState` | kept | lost (5, 21) | lost |
| Reveal seen, reveal step | `reveal-seen.ts:5`, `reveal-container.tsx:55` | kept | reveal never shown | reveal leaves |
| Pick-again turned-down list, working-line turn | `DayMemory` | kept | reset | reset |
| `sessionRowId` | `DayMemory` | kept | restored from first open row (3) | cleared |
| Drawer open | `drawer-view.ts` | kept | closed | closed |
| Crisis "sit with me" | `crisis-screen.tsx:28` | kept | reset | n/a |
| Pending-action ids seen | `pending-actions.ts:43` | kept | reset (list already removed) | n/a |
| World piece landed | `world-container.tsx:19` | kept | pops again | n/a |

Stored and safe: running session (start, end, treat, thoughts), "not finished" tapped, energy answer, tasks, drawer, settings, care reminder, Plus customer.

## Timers and scheduled effects

| Effect | Set at | Cancelled at |
|---|---|---|
| Session end, warning, check-in timers | `effects-runner.ts:71-80` | `cancel_timer` on finish, leave, not-finished, crisis. **Never** on rebuild (day turn, delete, restore) |
| Live Activity | `effects-runner.ts:133-143` | finish, leave, time-up catch-up, crisis. **Never** on rebuild |
| Haptic taps | `native-adapters.ts:101-107` | **never** (known) |
| Cue warm-up chain | `native-adapters.ts:76-89` | never (ends itself) |
| Day-turn watcher | `day-watch.ts:18-21` | provider unmount; not re-run after a skipped turn |
| Model patience, 8 s | `task-flow.ts:83` | `stopTimer` at `:87`; the HTTP call is not aborted and its late answer is dropped |
| Day-plan notifications | `effects-runner.ts:166-181` | replaced on each changed plan; survive delete-everything by being re-planned |
| Charge reminders | `M/features/plus/charge-reminders.ts:62-73` | on each Plus refresh only |
| Care reminder | via the day plan | cleared when the task is no longer set-and-serious (`day-refresh.ts:55`) |
| Session 1 s tick, 90 s line turn, burst hold, parked note | `use-session-screen.ts:38,99,107,119` | effect cleanup |
| Hold animation frame | `use-hold-control.ts:58-60` | unmount (`:63-68`) |
| Composer notice, waveform | `use-composer.ts:99`, `waveform.tsx:48` | cleanup |
| Dump reveal, finish reveal give-up | `M/features/dump/reveal.tsx:130`, `reveal-container.tsx:104` | cleanup |
| Restore look, 4 s | `M/features/backup/restore-offer.tsx:82` | cleanup |
| Record playback, card tilt, tap reactions, crisis clock | `M/features/record/use-record-playback.ts:49-59`, `M/features/reveal/ui/card-view.tsx:58`, `M/art/use-reactions.ts:65`, `M/features/care/use-now.ts:14` | cleanup (the inner `setTimeout(…, 0)` in playback is not, harmless) |
| Table socket retry, ping, pong | `M/api/table-socket.ts:139-150` | not traced |

## Could not determine

- Whether the server versions snapshots or refuses an older-looking PUT. If it does, item 1 is "restore never offered" only.
- Whether `router.replace('/')` over an existing index creates a second instance on a device with expo-router 58. Item 10 depends on it; there is no singular-route setting in `M/app/_layout.tsx`.
- Whether iOS still delivers the second tap to the covered Start button while the push begins. This is the width of item 3's window; the queue order makes it fire whenever the tap lands.
- Whether the Live Activity itself alerts at its end date, and what it shows after a rebuild or a kill.
- Which recogniser events a phone call or backgrounding produces on device (item 15).
- Whether the Swift intents open the app at once (item 23), and what the server's data-delete does to shared pages and the account (item 28).
- Tables, haunts, friends, the table strip and the socket were skimmed only, as they are not usable yet.