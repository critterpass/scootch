# A website monster arrives in the app

Status: planned · Created 8 Oct 2026 · Decided by the founder, 8 Oct 2026: the
App Store version waits for this, and the monster that arrives is the same
monster (its name, card line, body and seed), not a new one hatched from the
same words.

Source: [product-brief.md](../../docs/product-brief.md) section 9 ("Catch it
in the app" carries the monster through install) and section 11; the Get board
("Anything you hatched here will be waiting in the app, ready to hunt").

## Why now

The App Store build carries an App Clip that only says "Placeholder App Clip",
and App Store Connect will not take the version for review until the App Clip
section is complete. Nothing reads what the clip stores, no page invokes it,
and the app has no route for a monster's link, though the site's association
file promises one.

## How it works

1. A monster's page (`scootch.app/m/<id>`) and the Get page offer the App Clip
   and the app. The clip shows the monster's card and the install prompt, and
   keeps the link in the App Group.
2. The app opens a monster's link (a universal link, its scheme, or the link
   the clip kept) by reading the monster's page from the API. With what was
   typed on it, the thing is taken in exactly as a thing shared from another
   app is, carrying the page's id.
3. The task call takes that id. The server, which already holds the monster,
   screens the words as always, gives stage one the monster's body, and at the
   name step writes only a kind line and a hatch line about the monster's own
   name. It signs the words again with the monster's own seed. The pack is
   then written about that name, as for any monster.
4. The phone draws the monster from the seed and body it is given, so it needs
   no change to how a monster is made.
5. When the monster is caught on the phone, its page reads CAUGHT.

A monster whose owner hid what was typed carries no thing: the server never
had the words. Its link opens the app at home, and that is logged in
`docs/undesigned-states.md`.

## Phases

| # | Phase | Owns | Needs | Status |
|---|---|---|---|---|
| 1 | [The task call adopts a website monster](phase-01-task-call-adopts.md) | `packages/domain/src/contracts`, `apps/api/src/ai/task-create`, `apps/api/src/routes/task-create*.ts`, `apps/api/test`, `packages/voice/evals` | — | in progress |
| 2 | [The app opens a monster's link](phase-02-app-opens-the-link.md) | `apps/mobile/src/app/m`, `apps/mobile/src/features/arrive`, `apps/mobile/src/state`, `apps/mobile/src/api` | 1 | not started |
| 3 | [The App Clip](phase-03-app-clip.md) | `apps/mobile/targets/app-clip`, `apps/mobile/targets/_shared` | — | not started |
| 4 | [The site offers the clip and the app](phase-04-site-offers.md) | `apps/web` | — | not started |
| 5 | [Caught on the phone, caught on the page](phase-05-page-reads-caught.md) | `apps/api/src/sharing`, `apps/api/migrations`, `apps/mobile/src/features/reveal` | 1, 2 | not started |
| 6 | [Made, listed and walked](phase-06-listed-and-walked.md) | `e2e`, App Store Connect | 1 to 5 | not started |

Phases 2, 3 and 4 own different folders and can run side by side once phase 1
has merged.

## Acceptance

- A monster made on scootch.app, opened on an iPhone with the app installed,
  is today's thing in the app with the same name, card line and drawing.
- The same from a phone with no app: the clip shows the card, the app is
  installed from it, and the monster is waiting on first launch.
- A heavy or crisis thing typed on the site never arrives as a monster.
- The App Clip section in App Store Connect is complete and the clip says
  nothing about being a placeholder.

## Unresolved questions

1. A monster whose typed words are hidden arrives as nothing. Is that right,
   or should the app show the card and ask what it was?
2. The website's monsters have a name and a card line but no kind line; the
   app writes one when the monster arrives. Should the website's card show it
   too, once written?
