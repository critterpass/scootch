# Phase 5: caught on the phone, caught on the page

Effort: high (permissions on a public page).

### 1. The page remembers who took the monster in
- Do: when a task call adopts a monster, the server notes the device on the
  shared monster. That device may then mark the page caught.
- Test: another device cannot.
- Status: done — see the commit that adds the `shared_monster_taken_in` migration

### 2. The phone tells the page
- Do: when an adopted monster is caught, the phone tells its page, as it
  already does for a monster it shared itself.
- Status: not started — waits for the app's link route

### 3. The page keeps the kind line
- Do: the kind line written when the monster arrives is kept with its page,
  the page's read answers with it, and the website's card shows it.
- Test: the read route; the page's card with and without one.
- Status: partly done — same commit: the page keeps the kind line, its read
  answers with it and a second arrival is given the same one. The website's
  card does not show it yet

Done when: a monster caught in the dev app reads CAUGHT on the dev site, with
its kind line.
