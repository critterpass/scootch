# Phase 09: tables and haunting

Status: not started · Tasks: 8 · Needs: 03, 04
Owns: `apps/api/src/tables`, `apps/mobile/src/features/{table,friends,haunt}`

Goal: doing the one thing next to a friend. Boards: Tables; Care and Edge
States section 05; Plus (friend pass); Growth section 02. High effort for
task 2.

Tables are for friends only at launch, joined by invite link. Seating with
strangers is after launch and is not built here. Where the Tables board shows
a strangers option, leave it out and log it in `docs/undesigned-states.md`.

### 1. Accounts
- Do: Sign in with Apple, asked only when opening or joining a table; linked
  to the anonymous token so nothing is lost.
- Test: signing in keeps the world, cards and drawer.

### 2. The table
- Owns: `apps/api/src/tables/`.
- Do: one Durable Object per table: up to four seats, a shared timer,
  presence, nudges, reconnection. Follows the phase 00 verdict.
- Test: join, leave, a dropped and resumed connection, a fifth person refused,
  the timer surviving the host leaving.

### 3. Labels
- Do: each seat's label is written by the AI as one or two words from the
  task; raw task text never leaves the phone for a table; the user can hide
  their label. A serious task shows no label.
- Test: no table message contains task text.

### 4. Lobby and seating
- Do: join by invite link; friends' open tables; invite through Messages,
  WhatsApp, Mail or a copied link.
- States: no friend's table open, invite expired, waiting alone. An empty
  table says the seats are saved and offers the invite; it never promises
  that someone will come.

### 5. At the table
- Do: four critters acting out their work modes; silent nudges; wrap-up where
  each marks done or not.
- States: waiting alone, someone leaves, nudge received.

### 6. Seat controls
- Do: an invite link can be forwarded, so a seat may hold someone the user
  does not know. Long-press a seat for mute, report and leave; three nudges per person
  per session; reports reach the Telegram bot with Dismiss, Warn and Ban
  buttons; `table.name` screens display names.
- Test: a banned id cannot join; the reported person is never told.

### 7. Friend pass
- Do: a Plus host covers up to three free friends at their table; opening a
  table is the Plus control; the guest sees no price.

### 8. Haunt a friend
- Do: send a monster with a preset dare; friends only; one per friend per
  week; catch it (becomes today's one thing) or shoo it; the sender is never
  told; "can be haunted" switch; never for a serious task.
- Test: every haunting rule from the board.

## Exit

- A device run with two phones at one table: start, nudge, one drops and
  returns, both finish.
- A report raised in the app is actioned from Telegram.
