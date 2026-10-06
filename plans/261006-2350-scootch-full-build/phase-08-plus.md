# Phase 08: Plus

Status: not started · Tasks: 8 · Needs: 05
Owns: `apps/mobile/src/features/{plus,shelf}`, `packages/domain/src/entitlements`

Goal: Scootch can be paid for without ever interrupting. Board: Plus. Read
product-brief section 7 first. High effort for tasks 1 and 2.

### 1. Entitlements
- Owns: `packages/domain/src/entitlements/`.
- Do: one function from purchase state to what is unlocked (free, trial,
  monthly, yearly, lifetime, expired, friend-pass guest). Every locked control
  reads it; nothing else decides.
- Test: every state, including a lapsed trial and a refund.

### 2. Purchases
- Do: the three products, purchase, restore through the Apple ID with no
  account, and state changes picked up from the store.
- Done when: sandbox purchase, restore and cancel are walked end to end.

### 3. The sheet
- Do: one sheet; the line changes with attitude; the button changes with the
  plan (trial on yearly, plain subscribe on monthly, buy once on lifetime);
  Terms, Privacy and Restore always visible; "Not now" in plain sight.
- Done when: sheets of nine combinations (three attitudes by three plans).

### 4. Locked controls
- Do: "One more" under your world (two more a day on Plus, then a cap); card
  finishes; the binder; "Keep this record" and the record shelf; the
  extra-large widget and StandBy. Each in its free and Plus state.
- Test: the house rules as a check. No paywall route is reachable from first
  launch, the one screen, a session or "Done for today".

### 5. The first offer
- Do: after the third catch, one line in the world, one tap to dismiss, not
  repeated that week.

### 6. Trial and renewal
- Do: trial started with both dates; the day-before reminder as a notification
  and a Live Activity line; the last-day screen with three equal choices; the
  renewal reminder three days before; renewal off confirmed. Cancelling and
  changing plan open Apple's sheet.
- Test: reminders are scheduled from the store's dates, not the phone's clock.

### 7. Lifetime, manage and the shelf
- Do: the lifetime moment (the 1 of 1 card and the lighthouse); the manage
  page; the shelf of inks, outfits and worlds, tried on live, each a single
  purchase.

### 8. The Scootch that learns you
- Do: on-device statistics for when the user really starts and what size they
  finish; they move the reminder hour and size the next ask; the weekly
  sentence; running jokes about past monsters through the task call.
- Test: the statistics, as pure functions.

## Exit

- The Money gate.
- The bot's digest shows trials and purchases from the sandbox.
