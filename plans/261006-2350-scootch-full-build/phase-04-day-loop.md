# Phase 04: the day loop

Status: see the audit note below · Tasks: 10 · Needs: 01 (art from 02 and routes from 03

> Audit 7 Oct 2026: walked on a device and on the founder's iPhone. Not built: arriving with a monster from the website, saying "done". Never walked: hold to talk, "Another", a heard deadline, pick for me, "Not now", too big, "I'm stuck", hold to finish, not finished.
replace placeholders and fixtures as they merge)
Owns: `apps/mobile/src/features/{launch,one-screen,dump,monster,session}`,
`packages/domain/src/{session,drawer,day}`

Goal: a fresh install goes from "Hello" to a caught monster. Boards: App flows
sections First launch, The one screen, Brain dump, The task becomes a creature,
Session.

### 1. Local data
- Owns: `packages/domain/src/day/`, the expo-sqlite schema.
- Do: days, tasks, drawer items, monsters, sessions, settings. The phone is
  the source of truth.
- Test: a day rolls over at the user's local morning, not at midnight UTC.
- Status: partly done — f29e5c7; pure logic and tests in packages/domain, no screens or storage yet; storage, client, effects and store in the app — 71638e7, not yet run on a device

### 2. First launch
- Do: hello, attitude, permissions asked in character before the system
  prompt, the first tiny thing. No account, no tour.
- States: microphone refused (typing only), notifications refused (said once);
  arriving with a monster from the website, which skips straight to "Catch
  Molar · 10 min" and asks the setup questions afterwards.
- Status: partly done — 1f4dae3; built and tested with fakes, not yet run on a device

### 3. The composer
- Do: hold to talk with on-device transcription, slide to cancel, typing, the
  waveform, Scootch reacting to each.
- States: silent or empty ramble, text Scootch cannot understand.
- Status: partly done — 1f4dae3; built and tested with fakes, not yet run on a device

### 4. Brain dump
- Do: the task call; one phrase lights up and the rest falls away; "Another"
  and "That's the one"; energy read; pick for me.
- States: slow model, model unavailable (the user picks; see phase 07).
- Status: partly done; screens built and tested with fakes — 8091f09, not yet run on a device

### 5. Deadlines and the drawer
- Owns: `packages/domain/src/drawer/`.
- Do: "deadline heard" before anything is parked; the dated item returns as
  the one thing on its day; the drawer opens only by a deliberate pull; swap
  in; undated items fade after two weeks.
- Test: return dates, fading, and that the drawer never opens by itself.
- Status: partly done — f29e5c7; pure logic and tests in packages/domain, no screens or storage yet; screens built and tested with fakes — 8091f09, not yet run on a device

### 6. Bargaining and shrinking
- Do: an excuse gets a smaller counter-offer; "too big" shrinks the task and
  the monster. The ask only ever gets smaller.
- Test: no path makes the ask larger.
- Status: partly done; screens built and tested with fakes — 8091f09, not yet run on a device

### 7. Hatching
- Do: the monster appears with its name and flavour text; "Catch him" sets the
  task; the treat is named before starting.
- States: a serious task skips hatching entirely.
- Status: partly done; screens built and tested with fakes — 8091f09, not yet run on a device

### 8. Session
- Owns: `packages/domain/src/session/`.
- Do: start burst; the shrinking disc; park a thought; "I'm stuck" and a timed
  check-in offering a tiny next step; two minutes left; leaving early is
  unremarked. Runs fully offline from the line pack.
- Test: the session state machine, including background, kill and relaunch
  mid-session.
- Status: partly done — f29e5c7; pure logic and tests in packages/domain, no screens or storage yet; screens built and tested with fakes — cefa1ed, not yet run on a device

### 9. Finishing
- Do: hold to finish, tap twice, say "done"; the same reward either way;
  "not finished" with carry on tomorrow, make it smaller, let it go; parked
  thoughts shown with keep or discard; done for today.
- Test: every finish method reaches the same state.
- Status: partly done; screens built and tested with fakes — cefa1ed, not yet run on a device

### 10. Morning and returning
- Do: the morning line about yesterday's leftover on days two and three; a
  return after a week or more with no mention of the gap.
- Done when: the fresh-user walk covers day one, day two and a return.
- Status: partly done; screens built and tested with fakes — 8091f09, not yet run on a device

## Exit

- The First minute gate: clean install to a caught monster on a device run,
  with the session run in airplane mode.
- Sheets for every state listed above, including largest text and keyboard open.
