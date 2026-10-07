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
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device; sign-out added (a server route and a row in Privacy and data), tested on both sides, not yet run on a device
- Do: Sign in with Apple, asked only when opening or joining a table; linked
  to the anonymous token so nothing is lost.
- Test: signing in keeps the world, cards and drawer.

### 2. The table
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device; the phone now follows the table's session clock (a late seat gets the time left, its own timer carries on with the line down), tested on both sides, not yet run on a device or on real Cloudflare
- Owns: `apps/api/src/tables/`.
- Do: one Durable Object per table with hibernating WebSockets: up to four
  seats, presence, nudges, reconnection. The timer is a stored end timestamp
  plus one alarm, never a ticking loop. State lives in storage and the socket
  attachment so it survives hibernation. Start from the source in the
  appendix of `plans/reports/spike-261007-0005-table-durable-object-report.md`.
- Do: a seat belongs to a person, not a connection. When the same person
  connects again, send `replaced` to the old socket before closing it (a bare
  server close never reached the client in the spike). A seat whose person
  has been offline for ten minutes is freed; `leave` frees it at once. The
  closing socket is excluded when working out who is present.
- Decide before building: who may start a session, whether someone can join
  mid-session, and whether nudges need a running session.
- Re-test on real Cloudflare from a phone: the replaced-socket close,
  half-open connections, and behaviour across a deploy.
- Test: join, leave, a dropped and resumed connection, a fifth person refused,
  the timer surviving the host leaving.

### 3. Labels
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device; each seat also carries its work mode id, hidden with the label, tested
- Do: each seat's label is written by the AI as one or two words from the
  task; raw task text never leaves the phone for a table; the user can hide
  their label. A serious task shows no label.
- Test: no table message contains task text.

### 4. Lobby and seating
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device
- Do: join by invite link; friends' open tables; invite through Messages,
  WhatsApp, Mail or a copied link.
- States: no friend's table open, invite expired, waiting alone. An empty
  table says the seats are saved and offers the invite; it never promises
  that someone will come.

### 5. At the table
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device; other seats' critters are drawn in their work mode with the idle motion, not yet seen on a device
- Do: four critters acting out their work modes; silent nudges; wrap-up where
  each marks done or not.
- States: waiting alone, someone leaves, nudge received.

### 6. Seat controls
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device
- Do: an invite link can be forwarded, so a seat may hold someone the user
  does not know. Long-press a seat for mute, report and leave; three nudges per person
  per session; reports reach the Telegram bot with Dismiss, Warn and Ban
  buttons; `table.name` screens display names.
- Test: a banned id cannot join; the reported person is never told.

### 7. Friend pass
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device
- Do: a Plus host covers up to three free friends at their table; opening a
  table is the Plus control; the guest sees no price.

### 8. Haunt a friend
- Status: partly done — aa1a667; server built and tested, no app screens yet, not deployed; app screens built and tested with fakes — 832b891, not yet run on a device; the seed a haunt carries is now exactly the phone's (a lower-case UUID), one contract for server and app, tested; no entry on the hatch screen or in the drawer yet: the boards draw neither and both screens belong to other work; sending now answers with the id of the haunt's page on the website and the page can be read and shooed by that link (server tested, not deployed); the app does not read the id or build the link yet, and whoever holds the link, the sender included, can see whether the monster is still waiting; "Haunt a friend" is now also on the hatch screen, under the hatched monster's words, only for someone signed in with a friend who takes haunts and never for a serious task or on a crisis or heavy day, opening the same send sheet (the rule is tested; the screen itself has never been seen on a device); a monster the server named is now drawn from a seed the server chose (a lower-case UUID, as before), which is the seed a haunt carries
- Do: send a monster with a preset dare; friends only; one per friend per
  week; catch it (becomes today's one thing) or shoo it; the sender is never
  told; "can be haunted" switch; never for a serious task.
- Test: every haunting rule from the board.

## Exit

- A device run with two phones at one table: start, nudge, one drops and
  returns, both finish.
- A report raised in the app is actioned from Telegram.
