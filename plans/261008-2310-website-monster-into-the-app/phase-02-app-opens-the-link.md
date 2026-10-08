# Phase 2: the app opens a monster's link

Effort: high (the day's state machine).

### 1. A route for the link
- Do: `app/m/[id].tsx`, for `scootch.app/m/<id>` in both languages and for the
  app's scheme. It reads `GET /v1/monster-page/<id>`. With typed words and a
  wild monster it dispatches the arrival and shows home; otherwise it shows
  home and nothing else.
- Test: the route's rules as a pure function.

### 2. The arrival carries the page
- Do: a thing that arrives with a monster's page is taken in as a shared-in
  thing is, and its task call carries `monsterPage`. The page id is kept with
  the offer until the call has been made, across a restart.
- Test: the day store, with the recorded fixture.

### 3. The link the clip kept
- Do: at launch and on coming to the front, the link the App Clip stored in
  the App Group is read once, cleared, and opened as above.

### 4. Undesigned states
- Do: log "a monster's link with hidden words" and "a monster already caught"
  in `docs/undesigned-states.md`.

Done when: the fresh-user walk has a step that opens a monster's link on dev
and finds the same name on the hatch screen.
