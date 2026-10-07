Audit of `the repository root` at `c83cd27`, read-only. Short answer to the founder: tables and haunting are in the build, but only behind a small "Sit with someone" link under a set task, and both are gated (Plus, Sign in with Apple, a friend) by steps nobody has run. Monsters, cards, world, zoo and record are reachable and were walked on a device.

Path prefixes: `M/` = `apps/mobile/src/`, `T/` = `.../apps/mobile/targets/`, `MOD/` = `.../apps/mobile/modules/scootch-live-activity/`, `A/` = `.../apps/api/src/`, `W/` = `.../apps/web/`, `E/` = `.../e2e/fresh/`, `P/` = `.../plans/261006-2350-scootch-full-build/`.

Assumptions and limits:
- I assumed the TestFlight build is the EAS `dev` profile (`apps/mobile/eas.json`, `APP_VARIANT=dev`, store distribution). On that variant the "Developer tools" row is visible in Settings (`M/screens/registry/support/developer-tools.ts:7-10`, `M/features/settings/settings-page.tsx:224-231`).
- Nothing was executed. "Reachable" means a control is wired in code, not that it works on a phone.
- "Seen on a device run" means a testID in `E/*.yaml`. The walk typed its task, skipped both permissions, ended the session with the developer control, finished by two taps and skipped every reveal step.

## Feature table

### Phase 02: characters and sound

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Scootch moods and motion | yes | every screen; `M/ui/scootch-says.tsx` | nothing | yes (stills in screenshots) |
| Squeak on tap | only on the Hello screen | `M/features/launch/first-launch.tsx:78`; the one screen passes no `onPress` (`M/features/one-screen/one-screen-view.tsx:241`) | nothing | no |
| 30 work modes | only when in a session (mode chosen by the task) | `M/features/session/screens/working-screen.tsx:204-211` | task call online for a mode | yes (one mode) |
| Monster generator, 20 bodies | yes | hatch `M/features/one-screen/stage-shown.tsx:213-254` | task call (dev API) for name and seed | yes |
| Shrinking a monster ("too big") | only when on the hatch screen, up to 3 times | `hatch-too-big`, `stage-shown.tsx:237-244`; local, `M/state/smaller.ts:53-60` | nothing | no |
| Card and finishes | card yes; Kraft, Gold, Night, Riso only when Plus | zoo tile then card `M/features/zoo/zoo-screen.tsx:78-86`; locked finish opens the sheet | Plus purchase | card yes, finishes no |
| Pose baker (art for widgets) | n/a (build asset) | `T/widgets/ScootchArt.xcassets/bake-manifest.json` | nothing | no |
| Sound and haptic cues | yes (ringer on, switches on) | `M/effects/native-adapters.ts:39-108` | nothing | not checkable (no audio in a flow) |
| The record's audio (bar, track) | yes | reveal `M/features/reveal/reveal-container.tsx:110-118`; `record-play` | nothing | `record-play` asserted, not tapped |

### Phase 03: AI, API, ops bot

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Input screen and task call (name, pack, lines) | yes (online) | composer send, `M/api/scootch-api.ts:66-106` | dev Worker and its model keys | yes |
| Small routes: shrink, bargain, stuck, pick, morning line, weekly sentence, record name | no server route for any | none in `A/routes/index.generated.ts`; only contracts in `packages/domain/src/contracts/ai-small-routes.ts` | routes not written; the phone does shrink, bargain, stuck and pick locally from the task pack | n/a |
| Voice check and offline lines | yes (implicit) | `A/ai/task-create/voice-check.ts`, `packages/voice` | nothing | implicit |
| Backup upload | automatic after a finish, only when a backup token can be stored | `M/state/day-store-provider.tsx:102`, `M/features/backup/backup.ts` | iCloud key-value or iCloud Keychain on the build; plan.md founder gate 3 says the main id "still needs iCloud" | no |
| Ops bot | n/a (founder's Telegram) | `A/routes/telegram-webhook.ts` | `TELEGRAM_*` secrets and webhook registration: unknown from code | no |
| Eval results to the bot | no | no Telegram step in `.github/workflows/ai-evals.yml` | not built | no |
| Push from the server | no | none: no APNs code or secret anywhere in `A/` (`A/env.ts:10-21`); the phone never sends a push token | APNs key, a send path, a token route | no |

### Phase 04: day loop

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| First launch (hello, attitude, permissions) | yes, once | `M/app/index.tsx:27-34` | nothing | yes (both permissions skipped) |
| Arriving with a monster from the website | no | none: `clip.invocation-url` is written by the clip (`T/app-clip/ScootchClipApp.swift:20`) and read by nothing in `M/` | App Clip is a placeholder; no universal links | no |
| Typing a task | yes | `composer-switch`, `composer-input`, `composer-send` | dev API | yes |
| Hold to talk | only when microphone and speech are granted and on-device recognition exists for the language | `composer-talk`; `M/features/composer/speech.ts:37-45` | permissions; Vietnamese on-device model: unknown | no (button asserted only) |
| Energy question | yes | `M/features/dump/dump-panels.tsx` (`energy-*`) | nothing | yes (`energy-guess`) |
| One thing, "Another", "That's the one" | yes | `stage-shown.tsx:155-169` | dev API | accept yes, another no |
| Deadline heard | only when the ramble has a date | `stage-shown.tsx:142-149` | dev API | no |
| Drawer | yes: pull the one screen down 90 points, or "Peek in the drawer" on the one-thing panel | `one-screen-view.tsx:236-238`; `drawer-peek` `stage-shown.tsx:69-75,151` | nothing; no visible affordance for the pull | no |
| Pick for me | only when the drawer has items | chip, `M/features/one-screen/composer-ways.ts:31-43` | nothing | no |
| Bargaining ("Not now") | only when a task is set | `not-now`, `M/features/one-screen/one-screen.tsx:222` | nothing (local) | no |
| Hatching, "Catch him" | yes | `hatch-catch`, `stage-shown.tsx:245-250` | dev API | yes |
| The treat | yes | `task-set-treat`, `M/features/one-screen/one-screen-panels.tsx:62`; handed over in `session/screens/after-screens.tsx` | nothing | field asserted; hand-over no |
| Start, 10/25/50, burst | yes | `one-action`, `task-set-minutes-*` | nothing | yes |
| Park a thought | yes | `session-park`, `working-screen.tsx:83-95` | nothing | yes |
| "I'm stuck" | yes | `session-stuck`, `working-screen.tsx:97-103` | nothing (local steps) | no |
| Timed check-in, two minutes left | automatic | effects runner | nothing | no |
| "End soon" (ends the timer in seconds) | only on a dev-variant build, after arming it in Developer tools | `session-developer-end`, `working-screen.tsx:111-118`; armed at `M/app/(dev)/developer-tools.tsx:85-94` | developer control, not in the store app | yes |
| "I'm done" early | yes | `session-finish-early`, `working-screen.tsx:104-110` | nothing | no |
| Hold to finish | yes (default) | `session-hold`, `finish-screen.tsx:71-82` | nothing | no |
| Tap twice to finish | only when chosen in Settings | `session-finish-tap-button` | nothing | yes |
| Say "done" | selectable, but nothing listens: it behaves as tap twice | `M/features/session/voice-finish-trigger.ts:17` (`null`) | listener not built | no |
| Not finished (three choices) | only when time is up | `session-not-finished`, `finish-screen.tsx:105-112` | nothing | no |
| Parked thoughts after | yes | `session-thought-*` | nothing | yes |
| Done for today | yes | `M/features/one-screen/one-screen.tsx:141-157` | nothing | yes |
| Morning carry-over, return after a gap | only when on day two or later | `M/features/one-screen/one-screen-stage.ts:110-118,147` | nothing | no |

### Phase 05: keeping

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Card reveal, world piece, bar | yes, after a finish | `M/features/session/use-session-screen.ts:88` | nothing | first screen yes, then every step skipped |
| "Your world" | yes | `world-button` `M/features/one-screen/one-screen-corners.tsx:27-35`; `world-row` on a done day | nothing | yes |
| Zoo | yes | `world-open-zoo`, `M/features/world/world-screen.tsx:72-77` | nothing | yes |
| Binder (sort) | only when Plus; locked control opens the sheet | `zoo-open-binder`, `zoo-screen.tsx:128-130` | Plus | control asserted only |
| The record (play, liner notes) | yes | `world-open-record`, `world-screen.tsx:78-83` | nothing | opened; play not tapped |
| Week's AI name and cover text | no: always "Week N" | nothing writes `week_records` except a restore (`M/features/backup/snapshot.ts:192`) | no record-name route or caller | no |
| Share story | only after an ordinary catch | `reveal-show-someone`, `M/features/reveal/reveal-screen.tsx:147-152` | page link needs the dev API `/v1/card-share` and the monster's signature; plan says the live screen refused a story | no (step skipped) |
| Share card, hide the task, unshare, save to Photos | only on a caught card | `zoo-share-card`, `zoo-screen.tsx:58-66`; `M/features/share/share-panel.tsx` | same as above | no |
| Share the week's clip | only when the week has a caught monster; goes out as a WAV with no link | `record-share-week`, `M/features/record/record-screen.tsx:128`; `record-container.tsx:66-72` | video and record page not built | no |
| Surprise drop | only when the rule fires on a finish | `reveal-drop-wear`, `reveal-drop-later`, `M/features/reveal/reveal-later-steps.tsx:77-117` | "Wear it" only records the wish; outfits are not drawn | no |
| Letting go | only from Not finished | `not-finished-screen.tsx` | nothing | no |

### Phase 06: system surfaces

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Local notifications | only when "Allow" was tapped at first launch; no later in-app ask | `first-launch.tsx:62`; scheduled at `native-adapters.ts:110-121` from `M/state/day-notifications.ts` | nothing server-side (local only). Tapping one only opens the app: no response listener | no (skipped) |
| Back-off and quiet hours | automatic; quiet hours editable | `settings-quiet-hours`, `settings-page.tsx:148-162` | Sleep and Focus: no code sets an interruption level | no |
| Live Activity and Dynamic Island | only when in a session with Live Activities on | `native-adapters.ts:139-157` | nothing server-side; never started with push updates | no |
| Park and "I'm stuck" on the Live Activity | iOS 17+; acted on when the app next opens | `T/widgets/_shared/SurfaceIntents.swift:36-61`; read by `M/features/surfaces/pending-actions.ts` | nothing | no |
| Widgets small, medium, large | yes, added by hand from the Home Screen | `T/widgets/TodayWidget.swift:63-75` | App Group on the signed build | no |
| Extra-large "Your world" widget | locked preview without Plus | `T/widgets/TodayWidget.swift:78-87`, `WorldWidgetView.swift` | Plus | no |
| Lock Screen accessories | yes, added by hand | `T/widgets/AccessoryViews.swift` | nothing | no |
| StandBy | small widget view reused | `SmallOrStandByView`, `TodayWidget.swift:57` | Plus lock in StandBy: unknown | no |
| Control Center and Action button | iOS 18+ only (deployment target is 16.4) | `T/widgets/ScootchWidgetsBundle.swift:11-14`, `StartSessionControl.swift` | nothing | no |
| Siri and Shortcuts | no dedicated support: three App Intents exist, no `AppShortcutsProvider` | `T/widgets/_shared/*.swift` | not built | no |
| Notification service extension | shell: passes every notification through | `T/notification-service/NotificationService.swift:5-10` | no remote push exists | no |
| App Clip | shell: "Placeholder App Clip" text, stores its URL | `T/app-clip/ScootchClipApp.swift:25-37` | no AASA file anywhere in `W/`; the app never reads the key | no |

### Phase 07: care, edge, settings

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Serious mode, "It's fine, be funny" | only when the screen answers serious | `one-screen.tsx:160-171`; `serious-be-funny` in `M/features/care/serious-panel.tsx` | dev API | no |
| Crisis screen | only when the screen answers crisis; no way out that day | redirect `one-screen.tsx:111-114`, `M/app/session.tsx:31` | dev API or the phone's own phrase gate | no |
| Helplines | yes | `settings-helplines`, `settings-page.tsx:218-223` | two rows unverified, which block a production bundle only | no |
| Offline start and offline pill | only when offline | `one-screen.tsx:116,307`; `offline` pill in corners | nothing | no |
| Model unavailable | only when the model is down | `day.modelDown`, `one-screen.tsx:159` | nothing | no |
| Finish-with setting | yes | `settings-finish-with`, `settings-page.tsx:163-169` | nothing | yes |
| Privacy page, keep transcripts | yes | `settings-privacy`, `settings-page.tsx:170-175` | nothing | yes |
| Export my data | yes (local file to the share sheet) | `privacy-export`, `M/features/privacy/privacy-page.tsx:71-74`; `M/state/data-tools.ts:45-46` | nothing | asserted, not tapped |
| Delete everything | yes | `privacy-delete`, then `delete-confirm` | dev API for the server half (retried later) | dialog opened, then "Keep" |
| Sign out, delete account | only when signed in | `privacy-sign-out`, `privacy-page.tsx:95-106` | an account | no |
| Restore offer | only at first launch on a phone that already holds the backup token and has a server snapshot | `M/app/index.tsx:30`, `M/features/backup/restore-offer.tsx:69-110` | iCloud key-value or Keychain sync; two phones | no |
| Settings: attitude, music, effects, haptics, motion | yes | `more-button` `one-screen-corners.tsx:50-58`, then the page | nothing | attitude yes, switches no |
| Language switch | yes | `settings-language`, `settings-page.tsx:189-211` | nothing | yes |
| "Invite a friend" row | no: drawn inert with the hint "Not open yet" | `settings-invite`, `settings-page.tsx:178-186` | not wired | no |
| Largest text, VoiceOver, Reduce Motion | system settings | `M/ui/use-screen-style` | nothing | no |

### Phase 08: Plus

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Manage page | yes | `settings-plus`, `settings-page.tsx:212-217` | nothing | no |
| Plus sheet | yes: manage page "See Plus", or any locked control | `plus-manage-see` `M/features/plus/manage-screen.tsx:85`; `one-more-locked`, `zoo-open-binder`, `record-keep`, `table-open-locked`, finish picker | RevenueCat must list `plus_monthly`, `plus_yearly`, `plus_lifetime` for the dev key (`M/features/plus/products.ts:20-24`, `eas.json`); otherwise the sheet reads unavailable. Whether they load: unknown | `record-keep` and `zoo-open-binder` asserted, never tapped |
| Purchase, restore, cancel | only when products load | `plus-sheet-action`, `plus-manage-restore`, `plus-manage-cancel` | sandbox products; never walked | no |
| "One more" | locked on a done day; real only when Plus | `one-screen.tsx:148-155`, `M/features/plus/one-more.tsx` | Plus | no |
| First offer | only after the third catch, in the world, not on the visit after a finish | `M/features/plus/first-offer.tsx:76-115`, `world-screen.tsx:69` | three catches | no |
| Trial started, lifetime moment | only after that purchase | `M/features/plus/sheet-container.tsx:36-38` | a purchase | no |
| Last-day screen, renewal off | only on a trial's last day, or after Apple's sheet | `M/features/plus/manage-container.tsx:47,58` | a trial | no |
| Charge reminders, trial-ends note | only when in a trial; local notifications | `M/state/plus-runtime.ts:66-80`, `M/features/plus/charge-note.tsx` | a trial and notification permission; the Live Activity line for it: not found | no |
| Shelf (inks) | yes | `plus-manage-shelf`, `manage-screen.tsx:107` | four inks only; three need store products `ink_*` (`M/features/shelf/catalogue.ts:42-75`); the chosen ink is stored and applied nowhere outside the shelf preview; no outfits or worlds | no |
| Keep this record, record shelf | only when Plus | `record-keep` `record-screen.tsx:108-120`; `record-shelf-open` `:105` | Plus | no |
| The Scootch that learns you, weekly sentence | no | none: `packages/domain/src/habits/habits.ts` is imported by nothing in `M/`; no weekly-sentence screen or route | not wired | no |
| Server enforcing Plus | no | `A/tables/tables.ts:16-25` trusts the phone's claim; `REVENUECAT_API_V2_KEY` is named in `A/env.ts:20` and used nowhere | RevenueCat webhook | n/a |

### Phase 09: tables and haunting

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Tables lobby | only when an ordinary task is set and not started (quiet link under "Not now"); never on a heavy day | `sit-with-someone`, `M/features/table/together-links.tsx:27-33`, drawn at `one-screen.tsx:223`; rule `M/features/table/table-rules.ts:40-42` | nothing to open the lobby | no |
| Open a table | only when Plus, then signed in, then named | `table-open` / `table-open-locked`, `M/features/table/lobby-page.tsx:52-57` | Plus purchase (server flag `tables.requirePlus` defaults on); Sign in with Apple | no |
| Sign in with Apple, display name | only when the server answers "account required" to open, join or friends | `M/features/table/lobby-containers.tsx:42-43,93`; `M/features/friends/friends-container.tsx:33` | Apple capability on the build: unknown; `M/features/account/apple-port.ts:7` says it has never run | no |
| Join a table | only by pasting the link or code into the lobby field | `table-join-field`, `table-join`, `lobby-page.tsx:66-92` | an open table; tapping the link itself cannot open the app (dev links point at `scootch-web-dev...workers.dev`, the app's associated domain is `scootch.app`, and no AASA file exists) | no |
| At the table: seats, nudge, timer, label, invite, leave | only when seated | `M/app/table/seat.tsx`, `M/features/table/table-page.tsx` | above; Durable Object on dev | no |
| Seat controls: mute, report, block | only by long-pressing another seat | `M/features/table/seat-sheet.tsx` | a second person; reports need the Telegram bot connected | no |
| Table strip over the session | only when seated | `M/app/session.tsx:34`, `M/features/table/table-strip.tsx:89-105` | above | no |
| Friend pass | server side on join | `A/tables/tables.ts:118-123` | a Plus host | no |
| Friends page | only from the lobby, signed in | `table-friends`, `lobby-page.tsx:99-100` | Sign in with Apple | no |
| Becoming friends | no | `/f/[code]` has no in-app entry: no paste field on the friends page; the invite is `https://scootch.app/f/<code>` (`table-rules.ts:18,21`); no `/f` page in `W/src/pages`; no AASA; scootch.app has no production deploy | friend page, universal links, production site | no |
| Haunt a friend, send | link shows under a set task for any uncaught ordinary monster and opens a sheet that says there are no friends | `haunt-a-friend`, `together-links.tsx:35-41`; hatch-screen copy only with a hauntable friend, `M/features/haunt/hatch-haunt-link.tsx:35` | a friend, which cannot be made | no |
| Haunt received (catch or shoo) | only when signed in, a haunt is waiting and nothing is chosen yet today | `M/app/index.tsx:38`, `M/features/haunt/haunt-containers.tsx:103-127` | same; no push tells the receiver | no |
| "Can be haunted" switch | only on the friends page | `friends-can-be-haunted` | Sign in with Apple | no |

### Phase 10: website

| Feature | Reachable today | Entry point | Blocked on | Device run |
|---|---|---|---|---|
| Home, monster maker, Plus and plain pages | on the dev site only | `W/src/pages` | scootch.app production deploy (prd D1 id is a placeholder in `apps/api/wrangler.jsonc`) | no (Playwright only) |
| Monster page, share from the maker | dev site | `W/src/pages/m/[id]` | as above | no |
| Card and story pages | dev site, fed by the app's share | `W/src/pages/c`, `s` | app share never run on a device | no |
| Record page | always "not found" | `W/src/components/record-page.astro` | no record read route in `A/routes` | no |
| Table invite and haunt pages | dev site | `W/src/pages/t`, `h` | no friend page | no |
| Into the app (universal links, banner, QR, carry the monster) | no | none: no `apple-app-site-association`, no banner, no QR in `W/`; `appStoreUrl` is a placeholder (`W/src/copy/index.ts:69`) | not built | no |
| Pre-launch waitlist | dev site switch | `A/routes/waitlist.ts` | no launch-day email sender | no |

## (a) Code exists, no entry point for a real person

- Becoming friends (`M/app/f/[code].tsx`), and with it sending or receiving a haunt end to end.
- Weekly sentence and "learns you" statistics (`packages/domain/src/habits/`).
- The week's AI name (the `week_records` table has no writer).
- Say "done" (selectable, no listener).
- "Invite a friend" in Settings (inert row).
- Arriving with a website monster (the clip's key is never read).
- Squeak on tap, anywhere after the Hello screen.
- Wearing a surprise drop, and wearing a bought ink outside the shelf preview.
- Push-updated Live Activity (token events in `MOD/ios/SessionPushTokens.swift` have no listener in `M/`).
- Small AI routes (contracts only).

## (b) Blocked on infrastructure or accounts

- **Remote push of any kind:** no APNs code, key or secret in `A/`, and no route that takes a device or Live Activity token.
- **Universal links and App Clip invocation:** no AASA file; dev share links use a `workers.dev` host that is not in `associatedDomains` (`apps/mobile/app.config.ts:137-141`).
- **scootch.app in production:** `LEGAL_LINKS` (`products.ts:33-36`) and the friend invite point there; prd resources are not created.
- **Plus:** products for the dev RevenueCat key must exist and load (unknown); no webhook, so the server trusts the phone.
- **Tables:** Plus, plus Sign in with Apple working on the signed build (never run), plus a second signed-in phone.
- **Backup and restore:** iCloud key-value or Keychain sync on the App ID (the plan says not finished); needs two phones to prove.
- **Reports from a table:** Telegram secrets and webhook (unknown from code).
- **Shared record:** no read route, no video.
- **Helplines:** two unverified rows block a production bundle only.

## (c) Status lines that disagree with the code

Claims more than the code supports:
- `P/phase-05` task 5: "the week's name and a cover" has no writer, yet the task reads "built and tested".
- `P/phase-08` task 7: the shelf "of inks, outfits and worlds, tried on live" is inks only, and the choice is applied nowhere.
- `P/phase-08` task 6: "a Live Activity line" for the day-before reminder was not found.
- `P/phase-06` task 2: "Sleep and Focus are respected" has no code behind it.
- `P/phase-06` task 7: built for iOS 18+ only, while the app installs on 16.4.
- `P/phase-06` exit ("starts a session from a notification"): no notification response handler exists.
- `P/phase-04` task 2: the "arriving with a monster from the website" state is not built.
- `P/phase-04` task 9: say "done" is a `null` seam.
- `P/phase-09` task 4: "invite through Messages..." works only as a pasted code; "friends' open tables" does not exist (`lobby-page.tsx:32-33`).
- `P/phase-09` task 8: no working way to gain a friend, so it cannot be used.
- `P/phase-10` task 6: no friend-invite page exists.
- `plan.md` "built in code through phase 10": phase 03 tasks 5 and 9 and phase 10 task 5 have no code.

Claims less than the code supports:
- `P/phase-05` task 7 says "not started ... nothing is uploaded"; the app posts cards and stories to `/v1/card-share` (`M/features/share/share-flow.ts`, `M/api/share-api.ts:52`).
- `P/phase-05` tasks 1 and 8 and `P/phase-08` task 8 say "no screens, storage"; rarity and the drop are stored and shown (`M/state/finish-earnings.ts:97`, `reveal-later-steps.tsx`). The habits half of 08.8 is still accurate.
- `P/phase-09` task 8 still says "no entry on the hatch screen" before correcting itself later in the same line; both entries exist.
- Every "not yet run on a device" line in phases 04, 05 and 07 is stale for what `E/01`–`06` walked.
- `P/phase-06` "never compiled into an app" is stale: `E/` flows ran against a native build that includes the targets.

No status line at all: `P/phase-03` tasks 5, 7 and 9; `P/phase-02` task 6; `P/phase-10` task 5.

Unknown from code: whether Sign in with Apple, iCloud key-value and the App Group are on the signed TestFlight profile; whether RevenueCat products load; whether Telegram is connected; whether on-device Vietnamese speech exists on the founder's phone.