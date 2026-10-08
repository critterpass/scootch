# Phase 4: the site offers the clip and the app

Effort: medium.

### 1. The banner
- Do: a monster's page and the Get page carry Apple's app banner with the App
  Clip's bundle id, for the app that the site belongs to (dev or prd). Not in
  pre-launch mode.
- Test: the page's head in both modes, in `apps/web/tests`.
- Status: done — see the commit that puts Apple's app banner on a monster's
  page and on the Get page with a monster.

### 2. "Catch it in the app"
- Do: on a phone the button opens the monster's own link, which the system
  hands to the app or the clip.
- Status: done — the button already opened `<scheme>://m/<id>`; the same
  commit adds the monster's link to the Get page's banner.

Done when: the site tests pass and the banner shows on the dev site.
