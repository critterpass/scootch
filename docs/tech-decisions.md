# Phu's Class: technical decisions

Decided 27 Oct 2026 unless marked **open**, from the build plan's decision table
(`plans/261027-phus-class/plan.md`). Change one only with new evidence, and
record the change here. Phu's Class is built in this repository in place of
Scootch; what Scootch decided and measured is in the history of this file.

## 1. Shape of the system

| Part | Choice | Why |
|---|---|---|
| App | Expo React Native, iPhone first | The infrastructure (database, effects, sheets and motion, HTTP client, care gate, helplines, purchases port, native modules and targets) is tested and works on device; most fixes ship over the air |
| Thầy Phú and the classroom | Skia, from the vector parts in `design/phus-class/`. Poses are data, animated with Reanimated. The same drawing is baked to images for widgets and the Live Activity | Skia is already in the app and bakes cleanly. Moving to Rive later replaces only the renderer |
| System surfaces | Swift targets through `@bacons/apple-targets` | Widgets and Live Activities are SwiftUI on any stack |
| Android | Built and kept green, not released | Linux runners are plentiful; macOS runners are scarce |
| API | Hono on Cloudflare Workers | No Docker, no upload timeouts, tests run locally in the Workers runtime |
| Data on the server | D1 (SQLite) | The data is small and per device |
| Images | Made on the phone | Share cards are drawn on the phone; nothing is stored for them on the server, so there is no R2 |
| Realtime | None | Tables and shared monsters are gone, and with them the Durable Objects |
| Website | Astro on Cloudflare Workers at phusclass.com | Same platform as the API |
| Data on the phone | expo-sqlite, the source of truth | Local first; hearing a task and starting it never need the network |
| Backup with no account | An anonymous token kept in both a synchronisable Keychain item and iCloud key-value storage; snapshots stored under it | Restores on a new phone without sign-up |
| Accounts | None | Nothing at launch needs an identity; the server knows a device by its token |
| Purchases | StoreKit 2 through RevenueCat | Projects "Phu's Class" and "Phu's Class Dev", entitlement `tuition`, offering `default` with `$rc_annual` and `$rc_monthly`. Products `phusclass.tuition.yearly` and `phusclass.tuition.monthly` (prd), `phusclass.dev.tuition.*` (dev), each with a one-week free trial |
| Languages | English and Vietnamese from the first screen | Strings in catalogues, a completeness check in CI, both languages in every sheet |
| Repository | Public, github.com/critterpass/scootch | No secrets, session links or personal data in code, commits or pull requests |
| Ops | A Telegram bot. No admin dashboard | See section 5 |
| Environments | Two only: dev and prd. No staging | Dev is where lanes, device runs and the founder's test builds point; prd is the App Store build |
| EAS project | `9fa12e59-52d4-4bbe-a34d-90e2ed174bf1` (`phusclass`, owner `critterpass`) | Created 27 Oct 2026 |
| Bundle ids | `com.phusclass.dev` (dev) and `com.phusclass` (prd), app groups `group.com.phusclass(.dev)`, schemes `phusclass-dev` and `phusclass` | Registered 27 Oct 2026. Two installable apps, one per environment |
| Package scope | `@phusclass/*` | The name in every import |

What is deliberately absent: Postgres, Redis, Durable Objects, R2, Docker,
Testcontainers, accounts, a back-office web app, a staging environment.

### Two environments

| | dev | prd |
|---|---|---|
| API | `phusclass-api-dev` at `api-dev.phusclass.com` | `phusclass-api` at `api.phusclass.com` |
| D1 | `phusclass-dev` | `phusclass` |
| App | The development and `e2e-test` builds, and TestFlight builds on the dev channel ("Phu's Class Dev") | The App Store build on the prd channel ("Phu's Class") |
| Purchases | Apple sandbox | Real |
| Website | `phusclass-web-dev` on workers.dev | `phusclass-web` at phusclass.com and www.phusclass.com |
| Bot | Posts with a `[dev]` prefix | Posts plainly |
| Deploys | Every merge to main | A tagged release, after the gates |

With no staging, two things carry the safety it would have given: the gates
run against dev before a release is tagged, and every server change is
backward compatible with the App Store build already in people's hands.
Feature flags keep unfinished work dark in prd.

A release is a `v*` tag on a commit of main. Pushing the tag runs
`deploy-prd.yml`: the helpline check, then prd's migrations, API and site, in
that order. The App Store app is made from the same commit with
`native-build.yml -f profile=prd`. The production API answers at
`api.phusclass.com`, the only address the App Store app calls.

After the App Store app is out, a JavaScript-only fix reaches it over the air
with `update-prd.yml`, which takes a commit of main and the commit the App
Store build was made from, and refuses a change to the native fingerprint.

### Keys

The founder's keys are reused: Jev (TypeSafe) and DeepSeek. They live in
Wrangler secrets and GitHub secrets, never in the repository. Usage is tagged
per project (`phusclass`) in the cost ledger. The API's secrets, by name:
`DEEPSEEK_API_KEY`, `TYPESAFE_API_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `REVENUECAT_API_V2_KEY`,
`REVENUECAT_PROJECT_ID`, `REVENUECAT_WEBHOOK_AUTH`, `APNS_KEY_P8`,
`APNS_KEY_ID`, `APNS_TEAM_ID` (`apps/api/.dev.vars.example`).

The RevenueCat public SDK keys and the Sentry DSN are public client keys and
are committed in `apps/mobile/eas.json`. Crash reports go to the Sentry
organisation `scootch`, project `phusclass-mobile` (EU).

## 2. AI: who does what

The free lesson must cost about $0.10 a month a student (brief section 7), so
hearing and picking run on the phone and the server writes only what the
phone cannot.

| Job | Runs on | Notes |
|---|---|---|
| Hearing (voice to text) | The phone: Apple speech, on-device only, in the app's language | Works offline and costs nothing. Audio never leaves the phone and is never kept. Typing is always there. ElevenLabs is gone |
| Picking and splitting | The phone, as rules in `packages/domain`: the pick order, deadlines, heard times and splitting a ramble | Ported from the server's task call. Where Apple's on-device model is available (iOS 26 and later) it splits rambles and words lines through a small native module (native batch two); the rules are the fallback and never wait on it |
| Serious-mode and crisis screen | The phone's keyword gate first, offline; then Jev when online | A task said offline stays plain ("Written down.") until Jev screens it when the connection returns. The on-device model may only add caution, never clear a task |
| His lines | The offline pack first (`packages/voice/offline/`), written per language | The server writes a fresh line only for a task the pack has no good line for, when online and screened |
| Fresh lines | DeepSeek, on the server | Every line passes the code check (`packages/voice/src/class/check.ts`) before it is shown |
| The timetable | The phone reads the calendar | Events never leave the phone; the calendar is never edited |
| Share images | The phone draws them | Nothing is uploaded to make a card |

### The care screen: the phone gates, Jev judges

From the 7 Oct spike (40 inputs, 20 per language, written by the spike
itself, so the numbers are optimistic):

| Check | English | Vietnamese | Missed crisis |
|---|---|---|---|
| Keywords with idioms removed | 19 of 20 | 19 of 20 | 1 per language (a method named with no explicit word) |
| Jev `jev-1.13.0`, one choice question | 20 of 20 | 20 of 20 | 0 |

Jev answered in about 260 ms at the median and under 560 ms at worst.

- The phone's keyword pass is a gate, not a judge. An explicit crisis phrase
  triggers crisis at once, offline. Any dark or serious word holds the joke
  until Jev answers. Idioms ("this inbox is killing me", "chết mất") are
  removed before matching.
- Jev decides, with two care questions asked side by side (never one after
  the other, so the answer stays inside the 800 ms budget). The care question
  sorts the note: crisis when p(crisis) is 0.10 or more; otherwise serious
  when p(serious) is 0.20 or more or p(pass) is under 0.90. The preparation
  question asks only whether the writer may be planning to harm themselves,
  indirect signs included (a place, a time, a means, a farewell, belongings
  given away, affairs put in order): crisis when p(yes) is 0.50 or more,
  whatever the care question said. It only ever adds a crisis.
- A pass needs both answers. When either goes unanswered by Jev and by the
  fallback, the other can still call a crisis; short of that the text counts
  as not screened: serious, and "be funny" cannot lift it.
- Only Jev can clear a text. When the fallback model gave any of the answers
  behind a pass, the verdict is `serious` with `reason: 'unscreened'` and
  `answeredBy: 'fallback'`: plain company and no joke, as offline, and the
  phone asks again when Jev is back. Jev is asked once more inside its 800 ms
  budget after a failure that came back quickly, and only with 400 ms or more
  left; a timeout, a rate limit or an overload goes straight to the fallback.
- Vietnamese typed without its marks is read twice: as typed, and with the
  marks restored by the fast model. The restored text is used only when
  stripping its marks gives back the note letter for letter; both readings
  are judged and the stricter verdict wins. A note that needed its marks and
  got no restored reading to trust is held as `serious` with
  `reason: 'unscreened'` and asked again.
- Measured 7 Oct on 207 cases on Jev: crisis caught 67 of 67, no crisis
  answered `pass`, false crisis 4 of 82 harmless notes. With Jev withheld no
  ordinary note is cleared.
- Every route screens through the one function (`screenText`). The screen
  judges what a person typed, never what the server wrote.
- Not yet tested: the reject label, long rambles, speech-to-text errors from
  on-device hearing, more than a handful of mixed-language notes, and whether
  Apple's on-device model will label self-harm text or refuse it.

### Jev (TypeSafe)

Pinned version, thresholds in code, tuned on an eval set
(`packages/voice/evals/screen-input/`), a fallback that returns the same
shape, low confidence as a first-class outcome, and only the text the
question needs. Its one route is `screen.input`: pass, serious, crisis, or
reject (abuse, injection). English is Jev's primary language; the eval set has
English and Vietnamese cases, and a route that misses its bar in Vietnamese
runs on the fallback model for Vietnamese until it passes.

### The generation model: DeepSeek

Decided 7 Oct 2026 and kept: the larger model (`deepseek-v4-pro`) where the
writing matters most, the fast model (`deepseek-flash`) for short replies and
for restoring Vietnamese marks. Vietnamese lines are written in Vietnamese
from a Vietnamese voice guide, never translated. What is said is never used
for training: the founder has switched off data use for training on the
DeepSeek platform.

### On-device model

Apple's on-device model is a bonus where the phone has it (iOS 26 and later,
Apple Intelligence on). It ships in native batch two as
`modules/phusclass-intelligence`. Every job it does has a rule on the phone
that runs without it.

### What the privacy page promises

The website's privacy table is a commitment the build must match:

| Data | Kept |
|---|---|
| Audio | Never leaves the phone and is never kept |
| What is said or typed | On the phone until the user erases it. Sent to the server only to be screened, or for a fresh line once screened; not stored there, not logged, never used for training |
| Calendar events | Read on the phone only; they never leave it, and the calendar is never changed |
| Analytics | Counts only, no ad ids, 13 months |
| Crash reports | What broke and where, with the iPhone model and iOS version, sent to Sentry (project `phusclass-mobile`, EU). No console output. 90 days at most |
| Delete everything | Gone from phone and servers within 30 days |

## 3. Native surface, declared once

Every capability, entitlement, target and native module the launch scope needs
goes into a native batch, even if its feature lands later. After that, feature
work is JavaScript and ships over the air. A change that alters the native
fingerprint waits for the next native batch.

Declared in batch one (27 Oct 2026): iOS 17.0 as the oldest system; the App
Group and the Keychain group; iCloud key-value storage; Push and Time
Sensitive notifications and a notification service extension; Live
Activities; Associated Domains (`applinks:` and `webcredentials:` on
phusclass.com); In-App Purchase; the microphone and on-device speech
recognition; read access to the calendars (`expo-calendar`); adding to Photos
(saving a shared card); one widget target holding the widget and Live Activity
shells; and the local modules `phusclass-live-activity`,
`phusclass-notifications` and `app-icon`.

Not declared: the camera, the App Clip, the share extension, the notification
content extension, alternate app icons, Sign in with Apple and the
Communication Notifications capability.

Batch two adds the on-device model module and the App Intents (Siri and
Shortcuts).

A signed build can make or renew a provisioning profile by itself: the build
step is given the App Store Connect key the submit step already uses.
Capabilities are ticked on the App IDs by hand.

## 4. Ops: a Telegram bot

There is no admin dashboard. One Worker route receives Telegram updates, and
only the founder's chat id is accepted.

| The bot sends | When |
|---|---|
| Daily digest: new installs, tasks started and finished, trials, purchases, AI cost, error rate | Every morning |
| Alerts: error spike, AI provider down or falling back, cost over the day's cap, a failed deploy, a crisis-screen rate jump | As they happen |
| Voice eval result after any prompt change | On merge |

| The founder can ask | Answer |
|---|---|
| `/status` | Health of the API, the AI routes and the site |
| `/costs` | AI spend today and this month, by route |
| `/funnel` | Install to first start to day seven to trial to paid |
| `/user <token>` | State for one support case, with no task text |
| `/flag <name> on\|off` | Flip a feature flag |

The bot never shows task text, rambles or transcripts.

## 5. To prove before building on it

| Risk | Question |
|---|---|
| On-device hearing | Is Apple's on-device speech good enough in Vietnamese, and how fast do words appear while speaking |
| Picking on the phone | Do the ported rules split a long ramble as well as the server's task call did, in both languages |
| On-device screen | Answered 7 Oct: keywords alone miss indirect crisis notes; the phone gates and Jev judges. Whether Apple's on-device model can add caution is untested |
| Baked poses | Do Skia-drawn poses of Thầy Phú export cleanly for widgets and the Live Activity |
| Token restore | Researched 7 Oct: Keychain sync plus key-value storage. Still to test on two real phones |
| Voice | Of two DeepSeek models, the larger writes better in both languages but ignores length limits in Vietnamese; every line passes the code check, so a long line is replaced, never shown |
