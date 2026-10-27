# What carries over from Scootch

Surveyed 27 Oct 2026 from listings and excerpts, so check each item when you
touch it. **Keep** means it is infrastructure Phu's Class uses as it is.
**Adapt** means it is useful once the Scootch concepts are taken out.
**Drop** means delete it.

## apps/mobile

**Keep:**
- `src/db/database.ts` and `migrate.ts`, with a fresh `migrations/` folder.
- `src/i18n/*`, `src/effects/*`.
- `src/ui/motion/*`, `src/ui/sheet/*`, `safe-frame`, `pull-to-close`, `swipe-away`, `use-palette`.
- `src/api/http-client.ts`, `app-http.ts`, `api-error.ts`.
- `features/offline/connection.ts` and `pretend-offline.ts`.
- `modules/app-icon` (the alternate icons themselves are dropped).

**Adapt:**
- `src/api/care-gate.ts` and `care-words/`.
- `features/care/*`: crisis view, serious panel, helplines page.
- `features/composer/*`: becomes "Say it". Phone speech first; drop cloud speech, `scribe-session` and `speech-tokens`.
- `features/plus/*`: becomes tuition. Products, offer rules, charge reminders and house-rules tests.
- `features/session/*`, `features/settings`, `features/privacy`, `features/launch`, `features/backup`, `features/surfaces/*`, `features/share`.
- `state/`:
  - keep `heard-time`, `day-rollover`, `day-notifications`, `late-words`, `parked-thoughts`, `start-cue`, `task-flow`, `pick-flow`
  - rewrite `day-types`, `day-store`, `finish-earnings`, `lines`
- `modules/scootch-live-activity` and `modules/scootch-notifications`: rename to `phusclass-*`. `modules/scootch-reading`: read it first.
- `targets/widgets`: keep `SessionLiveActivity` and `SurfaceWidgets`; drop `TableViews`, `FriendsTablesViews`, `Lurker` and `ShelfAndTerrarium`.
- `targets/_shared`: new app group; drop `Hunt*` and `MorningHunt`.
- `targets/notification-service`.
- `targets/share`: becomes "Add to the board".

**Drop:**
- `src/art/*`.
- Features: `monster`, `haunt`, `friends`, `table`, `camera`, `studio`, `zoo`, `world`, `keep`, `reveal`, `record`, `look`, `account`, `arrive`, `dump`, `one-screen`, `drawer`, `home-pager`. Mine their logic first if useful.
- API clients: `hunting-api`, `monster-page-api`, `together-api`, `camera-api`, `table-socket`, `cloud-speech`.
- Routes: `binder`, `haunt`, `table*`, `zoo`, `world`, `studio`, `camera*`, `m/`, `f/`, `t/`, `vi/`, `reveal`, `record`.
- Most of `screens/registry`.
- `modules/scootch-video-writer`, `targets/app-clip`, `targets/notification-content`.

## packages

- **voice, adapt:** keep `check.ts`, `line-rules.ts`, `offline/*` (structure), `guide/*` and `text.ts`. New line kinds and all content for Thầy Phú.
- **i18n, adapt:** keep `completeness.ts`, `catalogue-types`, `helplines/*`. New catalogues; drop the camera, together, world and catch catalogues.
- **sound:** keep `core/*`. New cues: the drum, chalk, tea, the bell.
- **tokens, adapt:** new palette (chalkboard green, red pen, slate, paper, teak).
- **domain:**
  - keep `back-off`, `session`, `day`
  - adapt `entitlements`, `drawer` (becomes the board) and `contracts` (common, plus, speech, local-db)
  - drop `camera`, `hunt`, `rarity`, `rewards` and `habits`
- **art:** drop the monsters, cards and binder. Keep `core/` (pen, rng, geometry) and `backends/`.

## apps/api

- **Keep:** `route.ts`, `errors.ts`, `rate-limit.ts`, `device-auth.ts`, `ledger.ts`, `flags.ts` and `bot/*`. Routes: health, devices, data-delete, backup.
- **Adapt:**
  - `ai/decide.ts`, `jev.ts`, `claude.ts`, `screen-input.ts`
  - `ai/task-create/*`: port its rules to the phone; keep a line route
  - `plus/*` and the RevenueCat webhook
  - `push/*`: the topic changes to `com.phusclass`
- **Drop:**
  - `tables/*` and the `TABLE` binding
  - `hunting/*`, `sharing/shared-monsters`
  - accounts: friends, haunts and codes
  - camera, monster, haunt, friend, table and seat routes
  - `ai/camera/*`, `elevenlabs.ts`, `speech-token`
- Secrets, by name:
  - `ANTHROPIC_API_KEY`, `TYPESAFE_API_KEY`, `TASK_CONTINUATION_SECRET`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
  - `REVENUECAT_API_V2_KEY`, `REVENUECAT_PROJECT_ID`, `REVENUECAT_WEBHOOK_AUTH`
  - `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`

## apps/web

- **Adapt:**
  - `[...lang]/privacy.astro`, `terms.astro`, `helplines.astro`, `support.astro`, `help.astro`
  - `src/copy/plain-en.ts` and `plain-vi.ts`
  - `site-layout`, `site-nav`, `site-footer`, `app-store-badge`
- **Drop:**
  - the monster, haunt, friend, caught, record, invite and story pages
  - `api/monster-make.ts`
  - `c/ f/ h/ m/ r/ s/ t/`

## Scootch names hard-coded in infrastructure

- `apps/mobile/app.config.ts`: the EAS project id, owner and slug, `LINK_HOST`, names, bundle ids, app groups, schemes and permission strings.
- `apps/mobile/eas.json`: the RevenueCat keys and the Sentry DSN.
- `package.json` names: `scootch` and every `@scootch/*`.
- Workflows:
  - `ci.yml`: filters, `modules/scootch-reading/ios`
  - `ai-evals.yml`: `vars.SCOOTCH_API_URL`
  - `deploy-dev.yml` and `deploy-prd.yml`: D1 names, health URLs, `scootch.app`
  - `design-renders.yml`, `native-build-job.yml`
- `tools/scripts`:
  - `native-build-ios.sh` (artifact name)
  - `device-ios-local.sh` (cache and lock paths)
  - `device-ios.sh`, `device-ios-evidence.sh`, `device-run-flows.sh`, `device-android.sh` (`app.scootch.dev`)
  - `lane-install.sh`, `fetch-design-renders.sh`, `render-design-screens.ts`
- `e2e/`: `appId: app.scootch.dev` in every flow.
- App source:
  - API: `accounts/apple-token.ts`, `routes/push-tokens.ts`
  - Mobile: `api/api-config.ts`, `backup/native-token-stores.ts`, `plus/products.ts`, `targets/_shared/AppGroup.swift`
  - Every module `.podspec`
- GitHub variables:
  - `ASC_APP_ID` becomes 6827278436 and `ASC_APP_ID_PRD` becomes 6827278250
  - `SCOOTCH_API_URL` becomes `PHUSCLASS_API_URL`

## Signing and builds

- `native-build.yml` runs `eas build --local` on GitHub's macOS runners, with EAS-managed credentials (`EXPO_TOKEN`) and an App Store Connect key (`EXPO_ASC_*` secrets) so EAS can create profiles.
- `native-submit-ios.sh` runs `eas submit`.
- App IDs are kept by hand: `com.phusclass` and `com.phusclass.dev` are registered. EAS adds the extension ids and capabilities.
- Device runs are Maestro flows. `device-ios-local.sh` swaps the checkout's JavaScript into the published `e2e-test` build for the current native fingerprint.
