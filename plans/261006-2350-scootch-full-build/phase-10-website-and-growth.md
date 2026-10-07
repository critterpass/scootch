# Phase 10: website and growth

Status: see the audit note below · Tasks: 8 · Needs: 02, 03 · Owns: `apps/web`

> Audit 7 Oct 2026: dev site only. No production site, no universal links file, no banner or QR, no friend-invite page; the record page always answers not found.

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
- Status: partly done — 3e9df8e; the maker on the home page with all six states and the hide toggle, and `POST /v1/monster-make` (screen first, nonsense, the nap after twelve, voice check with fallback); nothing typed is stored yet, so the 24-hour deletion waits for shared cards, not deployed; the maker now answers with a signature over the name, the card line, the seed and the language, made with a secret of its own (`SHARE_SIGNING_SECRET`, not yet set on any environment)
- States: empty, hatching, hatched, too many tries, nonsense, offline.
- Test: a crisis input never returns a monster.

### 3. A page per monster
- Do: `scootch.app/m/<id>` with the card and a 1200 × 630 link preview image,
  rendered per page, cached, and regenerated when the monster is caught; "Make your own" and "Catch it
  in the app"; flips to CAUGHT when the owner catches it.
- Status: partly done — 78eff49; sharing from the maker (`POST /v1/monster-share`, unshare by token), the monster's page in both languages with wild, caught and not-found states, and a 1200 × 630 preview rendered in the Worker and kept per status; not deployed; the API now marks a shared monster caught for whoever holds its unshare token (`POST /v1/monster-page/:id/caught`, tested, and seen turning a local page to caught), and the app tells it when a monster it keeps a page for is caught, but nothing in the app gives a monster a page yet (that arrives with "Into the app"), so no page is turned by a real catch; `POST /v1/monster-share` now takes the name and the card line only with the maker's signature for exactly those words, seed and language, and refuses anything else, so a browser can no longer publish words of its own; the typed line, when shown, is still screened; the maker's page keeps the signature and sends it (browser test updated), not deployed

### 4. Pages for things shared from the app
- Do: caught card, share story and record clip pages, with a player for the
  clip. Replaces the phase 05 placeholder.
- Status: partly done — 6364d0e; the caught card page with the tilting card and the share story page, with their read routes, and the record page with its player, track list and not-found state; the app now posts a caught card and a share story (`POST /v1/card-share`: the card as the page draws it, the task line only on a card that shows it, screened, refused for a serious or crisis task) and shares the picture with the page's link, and takes the page down with the token it keeps (`DELETE /v1/card-share/:id`); server tested, a card seen going up and down against a local API and site, the app side never seen on a device; the live screen refused the one story posted locally (a card with no task line), so story sharing may be refused in practice until the screen is checked against monster copy alone; the API has no read route or clip for a shared record so every record link shows not found, the record's link preview uses the home image, not deployed

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
- Status: partly done — 3de8347; the site serves `/.well-known/apple-app-site-association` for both apps (the link paths in both languages, App Clips, web credentials), tested through the Worker; "Catch it in the app" gives the monster a page and goes to `/get?m=<id>`, where a phone gets a button that opens the app by its scheme and a wide screen a QR code of the monster's link drawn in the Worker (pull request #72, not merged when this line was written); no smart app banner (it needs the App Store id), no "send the link to my phone", no App Clip hand-off and no spike; the app has no `/m/` route and never fetches a web monster; the dev app's `associatedDomains` lacks the dev site's host; no device has opened any of these links

### 6. Invite and haunt pages
- Do: table invite and haunt landing pages, with expired states; shooing a
  haunt works on the web in one tap. No gift page at launch.
- Status: partly done — 6364d0e; the table invite and haunt pages in both languages (open, closed, waiting, shooed, already gone, not found, could not load) with link previews; the API now has the public reads for an invite and a haunt and the shoo from the web (tested, and both pages seen answering against a local API in each state), not deployed; seat labels now follow the page's language (the page passes it through the site's door); the app shares the invite and the haunt link on the site of its own environment, in the Vietnamese path for a Vietnamese reader, and offers the haunt's link after sending (never seen on a device); a wide screen has no QR code, the previews use the home image, not deployed; a friend link page (`/f/<code>`: valid, used or run out, not found) in both languages, and the invite, haunt and friend pages now open the app with their code by its scheme, fall back to the App Store address (still a placeholder) and show the code with a copy button and a line to paste it under "Sit with someone"; the invite copy no longer promises a held seat — 3de8347; seen against a local API and site, never on a phone

### 7. Home, Plus and plain pages
- Do: the home page with the maker as hero; the Plus page with prices and the
  house rules; privacy, terms, support, helplines by country, "what Scootch is
  and isn't", press kit, not found.
- Status: partly done — 78eff49; the home page, the Plus page and the plain pages (privacy, terms, support, helplines, what Scootch is and isn't, press kit, not found) in both languages; every prebuilt page answers with and without a trailing slash — 6364d0e; the helplines page reads the table the app reads, shows each line's hours and moves closed lines last by the reader's clock; its numbers were verified on 2026-10-07 except India and the opening hours of Hy Vọng Sống, and nothing yet stops the site being deployed with those unverified (the check is `tools/scripts/check-helplines-verified.ts`); the press kit has no downloads, not deployed; the copy now says up to three things a day are free and that a table for two is free, with bigger tables in Plus — 3de8347; what Plus adds to the number of things a day is not restated anywhere on the site

### 8. Pre-launch
- Do: the home page variant where "Catch it" becomes "Tell me when it's out"
  with one email field; an Android interest field. One email is sent on
  launch day, with a link that carries that exact monster into the app.
- Status: partly done — 78eff49; the bundle-time switch (`PUBLIC_PRE_LAUNCH=1`), the email field in place of "Catch it", the Android interest page and `POST /v1/waitlist`; no launch-day email is sent, not deployed

## Exit

- Playwright sheets at 1440 and 390 wide for every page and state.
- The share loop walked: share a card, open its page on another device, make a
  monster, install, find it waiting.
