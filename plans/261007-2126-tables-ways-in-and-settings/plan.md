# Tables: ways in, first time, around the table, managing

Status: app half built on `feat/tables-ways-in-and-settings`; server half open
Board: `design/Scootch - Tables.dc.html` as redrawn 7 Oct 2026 (five sections, 23 screens)
Parent: `plans/261006-2350-scootch-full-build/phase-09-tables-and-haunting.md`

## Standing decisions this follows

- Tables are for friends only at launch (product brief, sections 8 and 10).
  Where the board says "strangers", the app says "the table".
- The task set keeps what the founder set on 7 Oct: the length wheel, no
  "Treat after this" row, the task's own controls. Only the company choice is
  added to it.
- Opening a table is free for two and Plus seats four (pull request #65, "the
  app must follow"). The brief's Plus line still says "opening tables".
- Scootch's lines on the board are not written into screens. The line packs
  have no table slots, so every new screen uses plain words.

## The board, screen by screen

| Section | Screen | Now | Notes |
|---|---|---|---|
| 01 Ways in | From a set task | Built | "Alone / At a table" under the wheel; "Start at a table" carries the length to a seat and starts on sitting down |
| 01 | From the waiting screen | Built | Friend pill on home from `GET /v1/friends/tables`; no work word (server sends none) |
| 01 | From a friend's link | Built, less the field | Lands on who saved the seat; "Sit down" joins. No "Your one thing" field |
| 01 | Every way in | Diagram | Fourth door (Settings › Tables › Invite) built |
| 02 First time | Tables need a name | Built | Three promises, "Not now, start alone" |
| 02 | Apple's sheet | System | Now asks Apple for the name, to pre-fill only |
| 02 | What the table calls you | Built | Pre-filled first name, seat preview, label switch |
| 02 | Changed your mind | Built | Closing Apple's sheet offers "Try again" and "Start alone" |
| 03 Room | Finding a table | Built | Friends' tables with "Sit down"; open one for two; four seats locked |
| 03 | Waiting alone, Invite, Full table, Nudge, Someone leaves, Labels | Already built | Seats now follow the table's capacity; "finished and left" when the table says so |
| 04 Around | Table menu | Built, less one row | Hide label, mute nudges here, invite, leave. No "Move to another table" |
| 04 | A friend sits down | Built | Every arrival is named; no "Saved seat for Dana" |
| 04 | Done at a table | Built, less one row | Sat together, next thing, leave quietly. No "Keep the seat for" |
| 04 | Tables are quiet | Built, less two rows | No "was here an hour ago", no "Tell me when someone sits" |
| 05 Managing | Settings · Tables row | Built | Name or "Off"; "Invite a friend" now works |
| 05 | Tables | Built, less two controls | Name, who can sit (friends or nobody), show label, allow nudges, friends, muted and blocked, sign out, delete. No "Anyone", no "Seat me with" |
| 05 | Friends | Built, less history | Critters, "At a table now", swipe to remove, waiting links with Cancel |
| 05 | Delete table account | Built | Only the social side goes |

Every gap is logged in `docs/undesigned-states.md`.

## What still needs the server

Each is a contract change, so each is its own lane.

1. Done: deleting the table account alone (`POST /v1/accounts/delete`), the
   muted and blocked list (`GET /v1/seats/quieted`), waiting friend links and
   cancelling one (`GET` and `DELETE /v1/friends/invites`), and who can sit
   (`whoCanSit` on the account: friends or nobody).
2. **Friends page history**: when two people last sat together.
3. **A name on a waiting link** ("Link sent to Sam"): a link is made for
   whoever opens it.
4. **A friend's table with its word**: `GET /v1/friends/tables` with each
   friend's label, for "admin · 2 open seats" on the pill.
5. **Saved seats by name** ("Saved seat for Dana") and a seat held for the
   link's holder.
6. **Tell me when someone sits**: needs remote push, which is off.
7. **Table lengths**: the wheel offers nine lengths, the table's timer three.
8. **"Your one thing" on the link's landing**: a typed thing must be screened
   before it is a task; needs the composer's path, not a plain field.

After launch, with strangers: "Who can sit with you", "Seat me with", "Move to
another table", stranger-only arrivals staying silent.

## Proof

- Focused tests: `table.test.ts` (25), `haunt.test.ts`, `registry.test.ts`,
  `join.test.ts`, `sign-out.test.ts`, the one-screen files, and the i18n
  catalogue check. All pass locally.
- Changed files typecheck and lint clean locally. The full suites are CI's.
- Not seen on a device. Sign in with Apple has never run on a build.
- Walks extended: `e2e/fresh/02` (company choice), `e2e/fresh/05` (Tables row).

## Open for the founder

1. Is the task set right without the treat row? The board still draws it.
2. Should the brief's Plus line change to "a table for two is free"?
3. Vietnamese strings for the new screens need a native read.
