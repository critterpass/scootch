All paths are under ``. Everything below is from reading code and board text; nothing was run, and the rendered design images are not in the repo.

## 1. Flow breaks

**A. Two people become friends**
1. A sets a task today; "Sit with someone" is drawn only at the task-set stage (`apps/mobile/src/features/table/table-rules.ts:40`, `features/one-screen/one-screen.tsx:223`). Settings has no Friends row.
2. Lobby → Friends → sign in with Apple → name (`features/friends/friends-container.tsx:33`, `features/account/account-container.tsx:51-75`).
3. "Send a friend link" shares `https://scootch.app/f/<code>`, hard-coded to the prd host on dev builds too (`table-rules.ts:18-21`, `friends-container.tsx:51-58`).
4. **✗ [broken, site + config]** B taps the link. No `apple-app-site-association` exists in `apps/web` (`public/` holds only `badges/`, `og/`), so iOS never hands it to the app. The site has no `/f/` page (`apps/web/src/pages`: c, h, m, r, s, t only), so B gets the 404.
5. **✗ [broken, app]** No manual fallback: the lobby's paste field routes every code to `/t/<code>` (`features/table/lobby-containers.tsx:48-52`), and a friend code fails there (`apps/api/src/accounts/ids.ts:26-31` hashes by purpose).
6. Only via a working universal link: `/f/[code]` → `POST /v1/friends/accept` → "accepted" (`friends-container.tsx:68-90`). A sees B on the next Friends load only.

**B. Invite link by Messages → receiver seated**
1. **✗ [diverges, app + server]** A opens a table: Plus only (`features/table/lobby-page.tsx:50-58`; `apps/api/src/tables/tables.ts:21,45-48`). The decision says a free person opens a table of two; no two-seat cap exists (`tables/table-state.ts:85-97`).
2. A (Plus) taps Invite → share sheet with `<site>[/vi]/t/<code>` (`features/table/table-container.tsx:67-79`, `features/share/share-links.ts:17`).
3. **✗ [broken, site + config]** B taps it: no association file, so Safari opens the web invite page. Dev builds share a `workers.dev` host that is not in `associatedDomains` (`apps/mobile/src/api/api-config.ts:24`, `app.config.ts:131-135`).
4. **✗ [broken, site]** "Sit down" is a plain link to the placeholder `https://apps.apple.com/app/scootch` (`apps/web/src/components/invite-page.astro:46`, `src/copy/index.ts:69`). `data-sit-down` is never wired; the code is not carried.
5. **✗ [missing, native + app]** Through install nothing carries the code: the App Clip is a placeholder (`apps/mobile/targets/app-clip/ScootchClipApp.swift:25-36`) and nothing in `apps/mobile/src` reads `clip.invocation-url`.
6. **✗ [broken, app]** Even with an association file, a Vietnamese sharer's `/vi/t/<code>` has no app route (only `src/app/t/[code].tsx`; no `+native-intent`, no `+not-found`).
7. Working fallback on paper: copy link → set a task → "Sit with someone" → paste → `/t/<code>` → join → account → name → seat (`lobby-page.tsx:65-93`, `lobby-containers.tsx:71-104`).

**C. Sitting together through a session**
1. "Start 10 min together" starts the table timer and the person's own session, then replaces the route with `/session` (`table-container.tsx:55-66`).
2. **✗ [broken, app]** No way back to the table: the strip is a plain `View` (`features/table/table-strip.tsx:27-61`), and session, reveal and done screens have no table link. No nudging, answering or leaving.
3. **✗ [broken, server + native]** Phone locked: the socket is the only channel. The seat dims for the whole session and is freed after 10 minutes offline, about when a 10-minute session ends (`table-state.ts:6,137-141`). No push exists (`apps/api/src/env.ts:8-18`).
4. **✗ [missing, app]** The table id lives in memory only (`features/table/table-store.ts:80-88`); a relaunch forgets the seat.

**D. Haunt, sender to receiver**
1. **✗** Needs friendship (`apps/api/src/accounts/haunts.ts:47-52`), which flow A blocks.
2. Hatch-screen link, drawn only with a hauntable friend (`features/haunt/hatch-haunt-link.tsx:35`) → send sheet → `POST /v1/haunts`.
3. **✗ [missing, server + native]** Receiver is not told: "nothing is pushed" (`haunts.ts:106`). Growth "Haunt a friend · received" says one gentle notification.
4. **✗ [diverges, app]** The app asks once when Home mounts, not on foreground (`features/haunt/haunt-containers.tsx:108-119`), and shows the card only on a `nothing_yet` day (`features/haunt/haunt-rules.ts:73-75`).
5. Otherwise the sender passes the web link by hand (`haunt-containers.tsx:85-93`). The web page shoos; **✗** its "Catch it · 10 min" goes to the App Store URL (`apps/web/src/components/haunt-page.astro:62`), and the app has no `/h/` route.
6. **✗ [diverges, app]** In-app catch submits the dare's words as a typed task (`haunt-rules.ts:81-89`). The sent monster is dropped, a new one hatches from "Two minutes?", and no 10-minute session starts.

**E. Widget or notification tap → session**
1. **[diverges, native]** A widget tap opens home, `/session` only if one is running, or `/world` when done (`apps/mobile/targets/widgets/SurfaceStyle.swift:58-61`). The play mark starts nothing.
2. **[missing, app]** Notifications carry a body only (`apps/mobile/src/effects/native-adapters.ts:114-118`); no response listener exists in `src`.
3. The Control records `start_session` and opens the app (`targets/widgets/_shared/SurfaceIntents.swift:10-19`, `src/state/surface-actions.ts:26-35`); iOS 18 and later only.

**F. Web monster → app**
1. Hatching on `/` works (`apps/web/src/components/monster-maker.astro`).
2. **✗ [broken, site]** "Catch it in the app" is the bare App Store link with no monster id (`monster-maker.astro:110,123`; `monster-page.astro:64`).
3. **✗ [missing, site + native + app]** No `/get?m=` page, QR, send-to-phone, smart banner or App Clip experience; no "You brought Molar" first launch; the app never fetches a web monster.
4. **✗ [missing, server]** Pre-launch stores email and monster id and sends nothing (`apps/api/src/routes/waitlist.ts:24-47`); no launch-day mailer exists.

## 2. Behaviour gaps

1. [diverges] Decision: free Scootch is three things a day. Code: `FREE_STARTS_PER_DAY = 1` (`packages/domain/src/day/today-state.ts:3`).
2. [diverges] "Friends only" (brief §8): a link seats anyone, with no friendship check, and sitting together makes no friendship (`tables.ts:88-93`).
3. [diverges] Plus is the phone's own claim, unverified (`tables.ts:17-24`).
4. [missing] Tables "Finding a table" ("Friends only · Kofi is here", one-tap join): no route lists friends' tables.
5. [missing] Seat states "done · tidying", "finished and left", "joined 12 min ago": a seat carries only label, mode, name, online and nudges left (`packages/domain/src/contracts/table-messages.ts:85-97`).
6. [diverges] Labels "written by the AI" (brief §8) are a fixed table per work mode (`apps/api/src/tables/labels.ts:9-40`). There is no "share more" for friends.
7. [diverges] Nudges: three per sender in total, not per person. The count resets only when a session starts (`apps/api/src/tables/table-object.ts:157,168`), and nudges to a muted person are counted, then dropped (`:172`); a nudge to someone offline reaches no socket.
8. [missing] A received nudge is one haptic and a notice on the table page only (`src/state/together-context.tsx:70`). The `nudge` sound cue exists but is not played.
9. [diverges] Shared timer: only 10 minutes is offered (`table-rules.ts:125`), and the table page shows no countdown (`features/table/table-page.tsx:153-166`).
10. [missing] Friend pass (Plus board, both screens): no UI. `pass_full` reads as "table full" (`table-rules.ts:81-83`).
11. [missing] "Invite a friend" sheet ("I saved you a seat." card): only the system share sheet.
12. [missing] Mute is local state, never read back (`table-container.tsx:33`). Nothing ever unblocks (`api.block(id, false)` has no caller).
13. [missing] The server's `warned` flag (`apps/api/src/accounts/accounts.ts:158-165`) is dropped by the app (`src/api/together-api.ts:25-37`).
14. [diverges] Web invite copy says the link "opens Scootch" and "your seat is held for 10 minutes" (`apps/web/src/copy/together-en.ts:17,19`); neither happens.
15. [diverges] Decision: "Haunt a friend" on the hatch screen only. It is also drawn under a set task (`features/table/together-links.tsx:35-42`).
16. [diverges] "Never haunt about serious things": the server trusts the phone's `screen` field (`apps/api/src/routes/haunts-send.ts:35`).
17. [missing] Haunts never expire, and anyone holding the link, the sender included, can shoo (`haunts.ts:172-180`).
18. [diverges] "Every notification written fresh about the real task": only today's set, unstarted task uses its own lines; later days use the generic offline pack (`src/state/day-notifications.ts:88-119`).
19. [diverges] "Louder each time": `loudness` is computed (`packages/domain/src/back-off/notification-plan.ts:144`) and dropped (`day-notifications.ts:100-103`).
20. [missing] "Respect Focus and Sleep" switch (System Surfaces "Back-off and quiet hours"): no setting.
21. [missing] No notification of any kind for a haunt, a nudge, a friend sitting down, or a table session ending.

## 3. Motion and feedback gaps

1. [missing] Nudge landing: the design drops a toast from the Island (`data-anim="toast"`), nudger in `nudge` mood, receiver `celebrate`. Code: a static block and one haptic; every seat is `mood="working"` (`features/table/seat.tsx:70`).
2. [missing] Seat filling or arriving: no entrance, haptic or sound; seats appear on re-render (`table-page.tsx:126-141`).
3. [missing] Someone leaves: the design keeps the leaver `sleepy` with "done"; in code the seat vanishes and a text line appears.
4. [missing] Timer disc (`data-anim="disc"`) on the table: none.
5. [missing] Haunt arriving: a route push to a settings-style page, with no haptic, sound or tilting card (Growth `data-tilt`, `data-holo`). Sending shows text only.
6. [missing] Live Activity: no end or "caught" state. The line turns at most once unattended (`native-adapters.ts:141-155`; `targets/widgets/SessionLiveActivity.swift:22-24`).
7. [missing] Web hatch (Website "Hatch": wobble, crack, flip, buttons rise, sound): only `shake` and `pop` (`apps/web/src/styles/site.css:351-384`).
8. [missing] Web demo loop: four stills for everyone (`apps/web/src/components/home-page.astro:17-46`).
9. [diverges] Web card tilt exists on the caught-card page only (`caught-card-page.astro:33`).

## 4. Native surfaces

1. [missing] Push: no APNs secrets, no device push token, no sender. `UIBackgroundModes: remote-notification` has nothing behind it (`app.config.ts:144-145`), and Live Activity push tokens have no listener.
2. [missing] The notification service is a pass-through (`targets/notification-service/NotificationService.swift:5-10`).
3. [diverges] Live Activity "Park" and "I'm stuck" only queue an action, dropped after 30 minutes (`features/surfaces/pending-actions.ts:15`), with no feedback. They need iOS 17 (`SessionLiveActivity.swift:41`).
4. [missing] "Phone picked up" Live Activity with "Put it down": in-app line only (`surface-actions.ts:52-58`), as brief §11 accepts.
5. [missing] "StandBy · Plus" full-screen activity: no layout. Instead a free person's small widget shows a lock in StandBy (`targets/widgets/WorldWidgetView.swift:41-53`), though the small widget is free forever.
6. [diverges] Small widget with a task: title and play mark, no Scootch line (`targets/widgets/TodayWidgetViews.swift:75-107`). The running medium has no "Park".
7. [missing] Large "Table · deep work · You Dana Kofi Mei · Send a nudge": the large widget is today plus week bars. The snapshot has no table fields (`targets/_shared/SurfaceSnapshot.swift:27-45`).
8. [diverges] Extra large supports `.systemExtraLarge` only (`targets/widgets/TodayWidget.swift:85`). It draws a pose or the monster, not the world (`WorldWidgetView.swift:87`); bars fill by count, not weekday.
9. [diverges] The Control opens the app rather than starting "right away". "Hold: brain dump" is a second control. iOS 18 only (`targets/widgets/ScootchWidgetsBundle.swift:11`).
10. [polish] Timelines never refresh on their own (`TodayWidget.swift:24`): no morning line until the app is opened.
11. [missing] App Clip: English placeholder text, URL stored and never read, no association entry.
12. [diverges] Deployment target is 16.4 (`app.config.ts:30`); the board is labelled iOS 27. On 16.4 to 16.x there are no activity buttons or controls; tinted art needs 18.
13. [polish] Two copies of `SessionActivityAttributes.swift` (`targets/_shared`, `modules/scootch-live-activity/ios`) must stay identical.

## 5. Website

1. [missing] `/monster`: the maker lives on `/` only.
2. [missing] `/get?m=` ("Catch it · desktop": QR, send link).
3. [missing] `/f/<code>`.
4. [broken] `/r/<id>`: the site proxies `shared-record` (`apps/web/src/pages/api/[...route].ts:16`), the API has no such route, and the app shares no record (`share-links.ts:4`). Always not found.
5. [missing] Association file, smart app banner, QR codes.
6. [diverges] Every App Store button uses the placeholder URL (`copy/index.ts:69`).
7. [diverges] Link preview images: only the monster page has its own (`apps/web/src/lib/shared-preview.ts:45`); card, story, record, invite and haunt fall back to the home image.
8. [diverges] Maker actions: Catch, Save, Share (`monster-maker.astro:108-116`); the design has "Haunt a friend" and "Hatch another" beside them.
9. [diverges] Android: no visitor detection; the page exists only as a link.
10. [polish] The 404 is English only (`pages/404.astro:6-8`); the help page is `/support`, not `/help`.
11. [missing] Pre-launch is a build flag with a script (`apps/web/package.json:11`); no workflow builds or deploys it.

## 6. Ideas without design or code; designs without code

1. Decisions with no design and no code: the free table of two; the friend link flow (the page is logged undesigned, the path is broken).
2. Brief §9 record-clip page: web page only. Brief §11 App Clip hand-off: placeholder. Brief §11 QR and email: neither.
3. No design and no code: unblock, mute list, rejoin a table after relaunch, the table during a session, a warned-account notice.
4. Designs with no code: Finding a table, Invite a friend, both Friend pass screens, large table widget, StandBy activity, Phone picked up, web Catch it, First launch · monster waiting.

## Shortest list for two friends at a table and one haunt (dependency order)

1. Sign in with Apple proven on a device (`features/account/apple-port.ts:7` says it has never run).
2. A friend link that lands: the association file (or a friend-code paste field) plus a `/f/` page.
3. App routes for `/vi/t/<code>`; dev site host in `associatedDomains`.
4. A way to Friends and the lobby without a set task.
5. Free opening of a two-seat table: server rule, cap, client unlock.
6. Web "Sit down" that opens the app with the code; the real App Store URL.
7. A route from the session to the table, and a seat that survives a locked phone.
8. Haunt discovery: check on foreground at minimum; a notification needs push end to end.
9. Haunt catch that keeps the sent monster and starts ten minutes.

## Could not determine

- Anything on a device: sign-in, socket headers, Live Activity, widgets.
- Whether iOS 27 offers `.systemExtraLarge` on iPhone.
- Whether `surfaces.opened()` runs at launch and lands on `/session` (`surface-sync-host.tsx` not read).
- Whether notifications sound (no `sound` is set).
- Whether a display name can be changed later; web price copy against three a day; button press motion.
- The built site: a hook blocked reading `apps/web/dist`.
- The prd release: the D1 id is a zero placeholder (`apps/api/wrangler.jsonc:52`) and the workflows deploy and update dev only.