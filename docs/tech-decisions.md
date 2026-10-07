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
| Backup with no account | An anonymous token kept in both a synchronisable Keychain item and iCloud key-value storage; snapshots stored under it | Restores on a new phone without sign-up; either store can be switched off by the user, so the app reads whichever answers |
| Accounts | Sign in with Apple, asked only at a table | Tables need identity; nothing else does |
| Purchases | StoreKit 2 through RevenueCat | Entitlements, trials and offer codes without building a receipt server |
| Languages | English and Vietnamese from the first screen | Strings in catalogues, a completeness check in CI, both languages in every sheet |
| Repository | Public, github.com/critterpass/scootch | No secrets, session links or personal data in code, commits or pull requests |
| Ops | A Telegram bot. No admin dashboard | See section 5 |
| Environments | Two only: dev and prd. No staging | Speed. Dev is where lanes, device runs and the founder's test builds point; prd is the App Store build |
| EAS project | `534fb786-e7e7-4058-a3c4-636196dc5078` | Created by the founder, 7 Oct 2026 |
| Bundle ids | `app.scootch.dev` (dev) and `app.scootch` (prd) | Two installable apps, one per environment |

What is deliberately absent: Postgres, PowerSync, Centrifugo, Redis, Docker,
Testcontainers, a back-office web app, a staging environment.

### Two environments

| | dev | prd |
|---|---|---|
| API, D1, R2, table objects | `scootch-dev` | `scootch` |
| App | The development and `e2e-test` builds, and TestFlight builds on the dev channel | The App Store build on the prd channel |
| Purchases | Apple sandbox | Real |
| Website | A preview address | scootch.app |
| Bot | Posts with a `[dev]` prefix | Posts plainly |
| Deploys | Every merge to main | A tagged release, after the gates |

With no staging, two things carry the safety it would have given: the gates
run against dev before a release is tagged, and every server change is
backward compatible with the App Store build already in people's hands.
Feature flags keep unfinished work dark in prd.

### Keys

The founder's CritterPass keys are reused for Scootch: Jev (TypeSafe),
DeepSeek and ElevenLabs. They live in Wrangler secrets and GitHub secrets for
Scootch, never in the repository. ElevenLabs turns speech into text while the
phone is online (`ELEVENLABS_API_KEY`). Usage is tagged per project in the cost ledger so the two apps' spend can
be told apart.

## 2. AI: who does what

| Job | Runs on | Notes |
|---|---|---|
| Voice to text | ElevenLabs Scribe realtime when online; the phone (Apple speech) when offline or when ElevenLabs cannot be reached | Online, the audio streams from the phone straight to ElevenLabs on a single-use pass from the API, which sees neither audio nor words; the language is detected, not set. Offline, audio never leaves and the app language is used. Typing is always available |
| Serious-mode and crisis screen | The phone first, then Jev | The on-device check runs before anything is sent |
| Typed decisions | Jev, with a small generation model as fallback | Closed labels, yes/no and scores only |
| Picking the one thing, shrinking, bargaining, stuck help | A generation model | Structured output |
| Scootch's lines, monster names, flavour text | A generation model | The humour is the product |
| Monster drawing and the song | The phone, procedural | The model returns parameters; code draws and composes |
| Learned timing and task size | The phone, plain statistics | No model |
| Camera: Desk and Room | The phone (Apple's Vision) | The photo never leaves. The labels found go to a line route when online |
| Camera: Paper and Screen | The phone reads the words and their boxes (Apple's Vision); the generation model picks by line id | Decided 8 Oct 2026, as CritterPass reads receipts. Only the words leave, after the user allows it. The photo is sent to be transcribed only when the phone cannot read it. Every count is made by code |

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
  whatever the care question said. It only ever adds a crisis. A note made
  of arrangements alone reads as an errand to the care question (p(crisis)
  0.03 on the case that showed it), which no threshold could fix.
- A pass needs both answers. When either goes unanswered by Jev and by the
  fallback, the other can still call a crisis; short of that the text counts
  as not screened: serious, and "be funny" cannot lift it.
- Only Jev can clear a text. When the fallback model gave any of the answers
  behind a pass, the verdict is `serious` with `reason: 'unscreened'` and
  `answeredBy: 'fallback'`: plain company and no joke, as offline, and the
  phone asks again when Jev is back. A crisis or a serious the fallback finds
  stands. Jev is asked once more inside its 800 ms budget after a failure
  that came back quickly (a dropped connection, a 5xx, an unreadable answer)
  and only with 400 ms or more left; a timeout, a rate limit or an overload
  goes straight to the fallback, so nobody waits longer for Jev than before.
- Vietnamese typed without its marks (found in code by everyday words that
  are always marked, such as "khong" or "duoc") is read twice: as typed, and
  with the marks restored by the fast model. The restored text is used only
  when stripping its marks gives back the note letter for letter; both
  readings are judged and the stricter verdict wins. The restoring takes
  about 0.6 s, so these notes answer in about 1.1 s (1.5 s at worst measured)
  instead of 0.3 s.
- Measured 7 Oct on 187 cases (the second author's 134 plus 53 written for
  this change: 25 indirect plans and 28 dark but harmless notes): crisis
  caught 56 of 57 (53 before), false crisis on harmless notes 3 of 82 (the
  same 3 before, all from the care question: a fiction plot, a move abroad
  and a game note without diacritics). Still missed: one Vietnamese note
  without diacritics that names only a place and a time. Jev's answers move
  by about 0.05 between identical calls, so a case near a threshold can flip.
- Measured again 7 Oct after the two changes above, on the same 187 cases
  plus 20 new Vietnamese notes without marks (10 crisis, 10 harmless). On
  Jev: crisis caught 57 of 57 and 9 of 10 new (the same counts on the run
  before the change, where the note that names only a place and a time
  flipped to caught at p(crisis) 0.08 to 0.11; with marks restored its
  preparation answer moves from 0.06 to 0.52 to 0.69), no crisis answered
  `pass` (1 of the new notes before), false crisis 3 of 112 harmless notes
  and 3 of 10 new (4 before). With Jev withheld: crisis caught 53 of 57 and
  10 of 10 new (51 and 8 before), no crisis answered `pass` (2 and 2
  before); the four still missed answer `serious`. No ordinary note is
  cleared while Jev is down. One new crisis note without marks is still
  missed on Jev when the restored text is thrown away for changing a letter:
  as typed p(crisis) is 0.03, restored it is 1.00.
- A note that needed its marks and got no restored reading to trust (the
  fast model changed a letter, did not answer in time, or handed back a note
  with two always-marked words still bare) is no longer cleared as typed: its
  `pass` answers `serious` with `reason: 'unscreened'` and
  `answeredBy: 'default'`, so the phone keeps plain company and asks again. A
  crisis or a serious found as typed stands. The restoring is asked once more
  after a discarded or failed answer, inside the same 2 s budget and only
  with 1 s left (it answered in 0.65 s at the median and 0.95 s at worst over
  27 calls). Measured 7 Oct on all 207 cases on Jev, before and after: crisis
  caught 67 of 67 both times, no crisis answered `pass` both times, false
  crisis 3 then 4 of 82 harmless notes (one note that sits at the threshold
  moved) and 4 then 2 of the 10 harmless notes without marks. No restoring
  failed in either run, so none of the 10 harmless notes without marks was
  held as unscreened; the rule costs one such note each time its restoring
  fails.
- The task call says who judged: `answeredBy`, and `reason` when the text is
  unscreened, on every verdict of the single call and of stage one, with the
  screen route's own values. "Be funny" does not lift an unscreened text.
- Every route screens through the one function (`screenText`): the screen
  route, the task call, the monster maker and monster sharing.
- The screen judges what a person typed, never what the server wrote. A monster's
  name, title and card line leave the task call and the website's maker with a
  signature over exactly those words, the monster's seed and the language (an
  HMAC with `SHARE_SIGNING_SECRET`, a secret of its own; it does not expire,
  because a card is shared whenever its owner likes). `POST /v1/card-share`
  and `POST /v1/monster-share` make a public page only from words that carry
  it, and send only the task line or the typed line, when it is shown, through
  `screenText`.
- Offline, no task gets a joke or a monster until it has been screened.
- Not yet tested: the reject label, long rambles, speech-to-text errors,
  more than a handful of mixed-language notes, and whether Apple's on-device
  model will label self-harm text or refuse it.

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

### The generation model: DeepSeek

Decided 7 Oct 2026. The founder read the bake-off samples in both languages
and judged them good enough, so no Claude comparison was run. Starting split,
to be tuned on the evals in phase 03: the larger model (`deepseek-v4-pro`)
for the task call, monster names and flavour text, where the writing matters
most; the fast model (`deepseek-flash`) for shrink, bargain, stuck help and
other short replies. Every line passes the code check before it is shown.
Vietnamese lines are written in Vietnamese by the model from a Vietnamese
voice guide. They are never translations of the English lines, because the
humour and the monster names depend on wordplay. The privacy page promises brain dumps are never used for training. The
founder confirms DeepSeek's terms allow that and has switched off data use
for training on the DeepSeek platform (7 Oct 2026).

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

### What the privacy page promises

The website's privacy table is a commitment the build must match:

| Data | Kept |
|---|---|
| Ramble audio | Never kept by Scootch. Online it goes to ElevenLabs to be turned into text; offline the phone does it |
| Ramble transcript | Until the one thing is picked (or seven days if the user turns that on) |
| Typed tasks | Until the user deletes them |
| Web monster-maker input | 24 hours, unless the card is shared |
| Shared cards and records | Until unshared |
| Table label | While seated |
| Analytics | Counts only, no ad ids, 13 months |
| Delete everything | Gone from phone and servers within 30 days |

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
| Phone picked up | Answered 7 Oct by research: nothing can, while locked. See product-brief section 11 |
| Voice | Half answered 7 Oct: of two DeepSeek models, the larger writes better in both languages but ignores length limits in Vietnamese. No Claude model tested yet; needs a direct key |
| On-device screen | Answered 7 Oct: keywords alone miss indirect crisis notes; the phone gates and Jev judges. A bundled classifier is untested |
| Baked poses | Do Skia-rendered poses export cleanly for widgets and the Live Activity |
| Durable Object table | Answered 7 Oct locally: works, 26 checks pass. Not yet run on real Cloudflare or from a phone |
| Token restore | Researched 7 Oct: Keychain sync plus key-value storage. Still to test on two real phones in native batch one |
