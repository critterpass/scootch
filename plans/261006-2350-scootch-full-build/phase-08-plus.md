# Phase 08: Plus

Status: see the audit note below · Tasks: 8 · Needs: 05

> Audit 7 Oct 2026: no purchase has ever been made. The shelf is inks only and a chosen ink is applied nowhere outside its preview. The weekly sentence and "learns you" are not wired to any screen. No Live Activity line for the charge reminder was found. The server trusts the phone for Plus.
Owns: `apps/mobile/src/features/{plus,shelf}`, `packages/domain/src/entitlements`

Goal: Scootch can be paid for without ever interrupting. Board: Plus. Read
product-brief section 7 first. High effort for tasks 1 and 2.

### 1. Entitlements
- Owns: `packages/domain/src/entitlements/`.
- Do: one function from purchase state to what is unlocked (free, trial,
  monthly, yearly, lifetime, expired, friend-pass guest). Every locked control
  reads it; nothing else decides.
- Test: every state, including a lapsed trial and a refund.
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 2. Purchases
- Do: the three products, purchase, restore through the Apple ID with no
  account, and state changes picked up from the store.
- Done when: sandbox purchase, restore and cancel are walked end to end.
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 3. The sheet
- Do: one sheet; the line changes with attitude; the button changes with the
  plan (trial on yearly, plain subscribe on monthly, buy once on lifetime);
  Terms, Privacy and Restore always visible; "Not now" in plain sight.
- Done when: sheets of nine combinations (three attitudes by three plans).
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 4. Locked controls
- Do: "One more" under your world (two more a day on Plus, then a cap); card
  finishes; the binder; "Keep this record" and the record shelf; the
  extra-large widget and StandBy. Each in its free and Plus state.
- Test: the house rules as a check. No paywall route is reachable from first
  launch, the one screen, a session or "Done for today".
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 5. The first offer
- Do: after the third catch, one line in the world, one tap to dismiss, not
  repeated that week.
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 6. Trial and renewal
- Do: trial started with both dates; the day-before reminder as a notification
  and a Live Activity line; the last-day screen with three equal choices; the
  renewal reminder three days before; renewal off confirmed. Cancelling and
  changing plan open Apple's sheet.
- Test: reminders are scheduled from the store's dates, not the phone's clock.
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 7. Lifetime, manage and the shelf
- Do: the lifetime moment (the 1 of 1 card and the lighthouse); the manage
  page; the shelf of inks, outfits and worlds, tried on live, each a single
  purchase.
- Status: partly done — fe80188; built and tested with a fake store, not yet run against real products or on a device

### 8. The Scootch that learns you
- Do: on-device statistics for when the user really starts and what size they
  finish; they move the reminder hour and size the next ask; the weekly
  sentence; running jokes about past monsters through the task call.
- Test: the statistics, as pure functions.
- Status: partly done — ccdb754; pure logic and tests in packages/domain, no screens, storage or store SDK yet

## Exit

- The Money gate.
- The bot's digest shows trials and purchases from the sandbox.
