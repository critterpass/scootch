# Scootch: technical decisions

Decided 6 Oct 2026 unless marked **open**. Change one only with new evidence,
and record the change here.

## 1. Shape of the system

| Part | Choice | Why |
|---|---|---|
| App | Expo React Native, iPhone first | Reuses the CritterPass renderer, audio and pipeline; most fixes ship over the air |
| System surfaces | Swift targets through `@bacons/apple-targets` | Widgets, Live Activities and controls are SwiftUI on any stack |
| Android | Built and kept green, not released | Linux runners are plentiful; macOS runners are scarce. Android is the cheap test device |
| API | Hono on Cloudflare Workers | No Docker, no upload timeouts, tests run locally in the Workers runtime |
| Data on the server | D1 (SQLite) | The data is small and per user |
| Tables (realtime) | One Durable Object per table, WebSocket | A table is four people and a timer; no separate realtime service |
| Images and audio clips | R2 | Shared cards, link previews, record clips |
| Website | Astro on Cloudflare | Same platform as the API |
| Data on the phone | expo-sqlite, the source of truth | Local first; sessions never need the network |
| Backup with no account | An anonymous token in iCloud key-value storage; snapshots stored under it | Restores on a new phone without sign-up |
| Accounts | Sign in with Apple, asked only at a table | Tables need identity; nothing else does |
| Purchases | StoreKit 2 through RevenueCat | Entitlements, trials and offer codes without building a receipt server |
| Languages | English and Vietnamese from the first screen | Strings in catalogues, a completeness check in CI, both languages in every sheet |
| Repository | Public, github.com/critterpass/scootch | No secrets, session links or personal data in code, commits or pull requests |
| Ops | A Telegram bot. No admin dashboard | See section 5 |

What is deliberately absent: Postgres, PowerSync, Centrifugo, Redis, Docker,
Testcontainers, a back-office web app.

## 2. AI: who does what

| Job | Runs on | Notes |
|---|---|---|
| Voice to text | The phone (Apple speech) | Audio never leaves; typing is always available |
| Serious-mode and crisis screen | The phone first, then Jev | The on-device check runs before anything is sent |
| Typed decisions | Jev, with a small generation model as fallback | Closed labels, yes/no and scores only |
| Picking the one thing, shrinking, bargaining, stuck help | A generation model | Structured output |
| Scootch's lines, monster names, flavour text | A generation model | The humour is the product |
| Monster drawing and the song | The phone, procedural | The model returns parameters; code draws and composes |
| Learned timing and task size | The phone, plain statistics | No model |

### Jev (TypeSafe)

Used as in CritterPass (`docs/decisions/20260927-jev-decision-model.md` there):
pinned version, thresholds in code, tuned on an eval set, a fallback that
returns the same shape, low confidence as a first-class outcome, and only the
text the question needs.

Jev routes in Scootch:

| Route | Question |
|---|---|
| `screen.input` | pass, serious, crisis, or reject (abuse, injection) for a ramble, a typed task or a web monster-maker input |
| `task.work_mode` | which of the 30 work modes |
| `task.body_type` | which of the 20 monster bodies |
| `task.size` | does this fit ten minutes, or should Scootch offer to shrink it |
| `ramble.energy` | low, medium or fine, when the user picks "guess" |
| `share.private` | should Scootch avoid offering to share this task |
| `table.name` | is a display name acceptable |

English is Jev's primary language. Every Jev route has English and Vietnamese
cases in its eval set, and a route that misses its bar in Vietnamese runs on
the fallback model for Vietnamese until it passes.

Dates and deadlines are extracted by the generation model and then parsed and
checked in code. Jev is weak at numbers.

### The generation model (**open**)

The voice decides whether the product works, so the model is chosen by a
bake-off on the voice guide in phase 00, in both languages, not by habit.
Vietnamese lines are written in Vietnamese by the model from a Vietnamese
voice guide. They are never translations of the English lines, because the
humour and the monster names depend on wordplay. Candidates: Claude
Haiku 4.5 for the fast lines and Sonnet 5.5 for the brain dump, against the
DeepSeek route CritterPass uses. The provider must give a no-training,
zero-retention agreement, because the privacy screen promises it.

### One call per task

Setting a task makes one structured call that returns everything the day
needs: the one thing, the parked rest, any deadlines, the monster's name and
flavour text, a pack of session lines, and the day's notifications, in the
user's language. The phone
schedules the notifications locally. So a session, its Live Activity lines and
its notifications all work offline, and there is no push server for them.

### On-device model

Apple's on-device model is a bonus where the phone has it. Every on-device job
has a fallback (a small bundled classifier, then Jev), because it only runs on
recent iPhones with Apple Intelligence on.

## 3. Reuse from CritterPass

Copied in, then owned by Scootch (no shared dependency between the repos):

| From | For |
|---|---|
| `@cp/critter-art` (Skia) and `@cp/critter-bake` | Scootch, the monsters, cards, and baked poses for Swift targets |
| `@cp/sound-art` | Start burst, cues, the daily bar and the Sunday record |
| `@cp/ai` patterns | Gateway, Jev client with fallback, eval suites |
| `apps/mobile/targets` setup | Widget, Live Activity, notification and App Clip targets |
| `.github/workflows/device.yml` and the capture scripts | Device runs and design-beside-device sheets |
| `tools/scripts/no-plan-ids.test.ts`, lint and format config | Repository hygiene |

## 4. Native surface, declared once

Every capability, entitlement, target and native module the launch scope needs
goes into the first native build, even if its feature lands later. After that,
feature work is JavaScript and ships over the air. A change that alters the
native fingerprint waits for the next native batch.

Declared in batch one: App Groups, iCloud key-value storage, Push and Time
Sensitive notifications, Live Activities, Sign in with Apple, Associated
Domains, In-App Purchase, Siri and App Intents, microphone and speech
recognition, and the widget, Live Activity, control, notification-service and
App Clip targets.

## 5. Ops: a Telegram bot

There is no admin dashboard. One Worker route receives Telegram updates, and
only the founder's chat id is accepted.

| The bot sends | When |
|---|---|
| Daily digest: new installs, tasks started and finished, trials, purchases, AI cost, error rate | Every morning |
| Alerts: error spike, AI provider down or falling back, cost over the day's cap, a failed deploy, a crisis-screen rate jump | As they happen |
| Reports from tables, each with Dismiss, Warn and Ban buttons | As they arrive |
| Voice eval result after any prompt change | On merge |

| The founder can ask | Answer |
|---|---|
| `/status` | Health of the API, the AI routes and the site |
| `/costs` | AI spend today and this month, by route |
| `/funnel` | Install to first catch to day seven to trial to paid |
| `/user <token>` | State for one support case, with no task text |
| `/flag <name> on\|off` | Flip a feature flag |
| `/ban <id>` and `/unban <id>` | Table access |

The bot never shows task text, rambles or transcripts.

## 6. To prove before building on it

Each is a spike in phase 00, sized at ten to fifteen minutes.

| Risk | Question |
|---|---|
| Phone picked up | Can anything trigger the show while the phone is locked, or only on unlock |
| Voice | Which model writes Scootch best at all three attitudes, and at what cost per task |
| On-device screen | Does a bundled classifier catch the serious and crisis cases with no network |
| Baked poses | Do Skia-rendered poses export cleanly for widgets and the Live Activity |
| Durable Object table | Four phones, one timer, nudges, a dropped connection |
| iCloud token restore | Does the token survive a reinstall and reach a second phone |
