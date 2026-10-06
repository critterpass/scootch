# Phase 10: website and growth

Status: not started · Tasks: 8 · Needs: 02, 03 · Owns: `apps/web`

Goal: anyone can play with Scootch in ten seconds, and every shared thing lands
on a good page. Boards: Growth; Website (15 sections, with a copy sheet and
motion notes to follow exactly).

The monster maker can go live before the app as the pre-launch page.

The site is in English and Vietnamese. Monster names and flavour text are
written in the visitor's language, not translated.

The Website board shows things that are after launch. At launch, leave out:
the wall (navigation link and home strip link), Unwrapped, the camera modes
in the Plus list, gifts, and "tables with strangers" (say "tables with
friends"). The home strip of example monsters uses a fixed, hand-checked set.

### 1. Site shell
- Do: Astro on Cloudflare, tokens shared with the app, navigation and footer
  (helplines and the support-tool statement on every page), both languages,
  light and dark, Reduce Motion, large text up to 310%, Apple's official
  badge artwork.
- Status: partly done — 3e9df8e; Astro on Cloudflare with dev and prd, shared tokens, navigation and footer with helplines and the support-tool statement, both languages, light and dark, Reduce Motion; the App Store badge is a stand-in image and text up to 310% is unchecked, not deployed

### 2. Monster maker
- Do: one field; the input screen first (a heavy input gets one kind sentence
  and helplines, no monster); then name, flavour text and a monster drawn by
  the same generator as the app; hide-the-task toggle; a nap after twelve
  hatches in a row, for five minutes. Input is deleted after 24 hours unless
  the card is shared.
- Status: partly done — 3e9df8e; the maker on the home page with all six states and the hide toggle, and `POST /v1/monster-make` (screen first, nonsense, the nap after twelve, voice check with fallback); nothing typed is stored yet, so the 24-hour deletion waits for shared cards, not deployed
- States: empty, hatching, hatched, too many tries, nonsense, offline.
- Test: a crisis input never returns a monster.

### 3. A page per monster
- Do: `scootch.app/m/<id>` with the card and a 1200 × 630 link preview image,
  rendered per page, cached, and regenerated when the monster is caught; "Make your own" and "Catch it
  in the app"; flips to CAUGHT when the owner catches it.
- Status: partly done — 78eff49; sharing from the maker (`POST /v1/monster-share`, unshare by token), the monster's page in both languages with wild, caught and not-found states, and a 1200 × 630 preview rendered in the Worker and kept per status; nothing marks a monster caught yet, not deployed

### 4. Pages for things shared from the app
- Do: caught card, share story and record clip pages, with a player for the
  clip. Replaces the phase 05 placeholder.
- Status: partly done — 78eff49; the caught card page with the tilting card and the share story page, with their read routes; the app does not post to them yet and the record clip page is not built, not deployed

### 5. Into the app
- Do: universal links and the smart app banner; "Catch it in the app" carries
  the monster through install so it is waiting on first launch; a desktop page
  with a QR code and "send the link to my phone" (the address is used once,
  then dropped).
- Risk: iOS has no deferred link of its own. First prove, in a ten-minute
  spike, that the App Clip can hand the monster to the installed app through
  the shared App Group. If it cannot, the link is opened a second time after
  install, and the page says so.
- Done when: a device run installs from a monster link and finds the monster.

### 6. Invite and haunt pages
- Do: table invite and haunt landing pages, with expired states; shooing a
  haunt works on the web in one tap. No gift page at launch.

### 7. Home, Plus and plain pages
- Do: the home page with the maker as hero; the Plus page with prices and the
  house rules; privacy, terms, support, helplines by country, "what Scootch is
  and isn't", press kit, not found.
- Status: partly done — 78eff49; the home page, the Plus page and the plain pages (privacy, terms, support, helplines, what Scootch is and isn't, press kit, not found) in both languages; helpline numbers are unverified and the press kit has no downloads, not deployed

### 8. Pre-launch
- Do: the home page variant where "Catch it" becomes "Tell me when it's out"
  with one email field; an Android interest field. One email is sent on
  launch day, with a link that carries that exact monster into the app.
- Status: partly done — 78eff49; the bundle-time switch (`PUBLIC_PRE_LAUNCH=1`), the email field in place of "Catch it", the Android interest page and `POST /v1/waitlist`; no launch-day email is sent, not deployed

## Exit

- Playwright sheets at 1440 and 390 wide for every page and state.
- The share loop walked: share a card, open its page on another device, make a
  monster, install, find it waiting.
