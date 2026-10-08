# Phase 10: At a table

Owns: `apps/mobile/targets/widgets/Table*.swift`,
`apps/mobile/src/features/table` (what the surfaces are told), `apps/api`
(Live Activity pushes).

### 1. The table on the Lock Screen and the Island
- Do: four seats with their rings and one-word labels, a wave as a ripple,
  "Wave back" and "Leave table". Updated by push while the app is away.
- States: alone at the table, a seat left, nudges used up.
- Status: written in part — see the commit that adds `apps/mobile/targets/widgets/TableViews.swift`. The table is drawn on the Lock Screen and the Island, measured at 157 points on this Mac, and the app writes every change into it while it runs. "Updated by push while the app is away" is blocked: the phone registers no push token today, `push.remote` is off and Apple's key is not set. The two buttons open Scootch, since only the open app holds the table's connection

### 2. A friend sits down
- Do: the Island opens for three seconds for an invited friend. Nobody else
  is announced.
- Status: blocked — it is a push to the Live Activity, which waits on the same three things

### 3. Friends at tables, and StandBy
- Do: the two small widgets, friends' tables only, the open seat a button;
  StandBy shows the whole table.
- States: no friend is at a table.
- Status: done in part — see the commit that adds `apps/mobile/targets/widgets/FriendsTablesViews.swift`: one small widget, friends only, the open seat a button that opens Scootch and takes the seat. It shows what the app last asked the server for ten minutes, then says to open Scootch. StandBy shows the table through the Live Activity itself; there is no separate StandBy view
