# The website, redrawn

Status: in progress · Created 8 Oct 2026 · Boards: Website v2 (home), and
Scootch Web - Monster, Plus, Invites, Get, Help, 404, Wall, Unwrapped, with
their shared script `web-fx.js`, all in `design/`.

The founder redrew the website on 8 Oct 2026 as real pages, one board each,
replacing the Website board's fifteen sections. Read
[product-brief.md](../../docs/product-brief.md) sections 2, 6, 7, 9 and 10
before any task here. One branch, `feat/web-redesign`.

## What the boards change

| Board | Becomes | Replaces |
|---|---|---|
| Every board's header and footer | The site shell: a glass bar with a scroll line Scootch runs along, the "Get the app" capsule, a night footer with the care card and the giant wordmark | The old bar and footer |
| Website v2 | `/`: maker hero, the strip of names, the scrolled session, the lurker that grows, Lock Screen, tables, attitudes, Plus with seven finishes, things to share, who it is for, the last call | The old home page |
| Monster | `/m/<id>`: the card in foil beside its name, "your turn", a few hatched earlier | The old monster page |
| Plus | `/plus`: the fan of finishes, three plans, what is inside, answers | The old Plus page |
| Invites | `/t/<code>` and `/h/<code>`: the table with its seats, the haunt at night | The old invite and haunt pages |
| Get | `/get`: the way to the App Store, the hand-off with its QR code, Android, the press kit | The old hand-off page. `/android` and `/press` stay as plain pages, no longer linked from the footer |
| Help | `/help`: questions with a search, helplines, what Scootch is and isn't, privacy in short, a person to write to | The footer's links to `/support` and `/what-scootch-is`, which stay as plain pages. `/helplines`, `/privacy` and `/terms` stay as full pages |
| 404 | The not-found page, and the not-found state of every shared page | The Lostling card |

The caught card, share story, record and friend link pages are not on any new
board. They wear the new shell and keep their own layout.

## Where the brief wins over the boards

| The boards draw | The brief says | Built |
|---|---|---|
| The monster wall, Unwrapped, a gift page, with links in the bar and footer | After launch (section 10) | None of the three, and no link to them. The boards are in `design/` for when they come into scope |
| "Send courage", "Shoo it" and "High five" on a monster's page, and the owner's name on its card | Nothing like them; a stranger's page names nobody (section 9) | The page keeps "Hatch your own" and "Catch it in the app". **Open: does the founder want courage from strangers?** |
| Tables with "friends or strangers", free | Friends only; a free table seats two (sections 7, 8) | The site's existing, checked lines |
| An Apple Watch, a shield on chosen apps, sharing an email or web page into Scootch, a warning before the next calendar event, an app icon per mood | None is in the brief or in the app | Left out. The five "who it is for" tiles say only what the app does |
| "Hold to finish" | A catch, or two taps, or saying "done" | The web card is caught by holding or, from a keyboard or switch, by one press |
| "Send me the link" by phone number or email | QR code and email only, and the site has no mail sender | The QR code. No field |
| Five fixed helplines | The verified table, Vietnam included | The table the app reads, by country, with "all countries" one tap away |
| Help answers about features above, and "a person replies within a working day" | The reply promise is still open | The support page's existing answers; the write-to line promises nothing about time |
| "Can I gift Plus? Yes" | Gifts are after launch | Left out |
| Press kit downloads | None exist yet | The fact sheet and a line to write to; no dead download tiles |
| The world, on the Lock Screen, in a widget and on the poster | The world's generator lives in the app, not in the shared art | A shelf of caught monsters stands in |
| Light pages only | The site follows the reader's light or dark setting | Dark is derived from the app's dark palette; logged in `docs/undesigned-states.md` |

Vietnamese is written for every new line; the boards are English only.

## Phases

| # | Phase | Status |
|---|---|---|
| 01 | Boards into `design/`, this plan | done |
| 02 | Shell: inks, type, bar, footer, motion, the shared pieces (capsule field, pills, materials) | done |
| 03 | Home | done |
| 04 | Monster page and not found | done |
| 05 | Plus | done |
| 06 | Table invite and haunt | done |
| 07 | Get and Help | done |
| 08 | Sheets at 1440 and 390 in both languages and both schemes, the browser tests brought along | done locally: 66 browser tests, 70 sheets; the largest text size and a real phone are not checked |

## Done when

- Every page above sits beside its board at 1440 and 390 wide.
- The maker still hatches, naps, refuses nonsense and goes quiet for a heavy
  thing, in both languages, and "Catch it in the app" still carries the monster.
- With Reduce Motion nothing moves but the scroll line; every page reads at the
  largest text size.
- No page links to the wall, Unwrapped or a gift.

## Open, for the founder

1. Courage, shooing and high fives from strangers on a monster's page: wanted?
   They need a route, a notification to the owner and a limit on abuse.
2. "Ignored things get bigger": the home page says a waiting task's monster
   grows by the day. The app does not grow a monster yet. Build it in the app,
   or reword the section?
3. The wall, Unwrapped and gifts: still after launch, as the brief has them?
4. "Monsters text you": the board shows notifications sent in a monster's
   name. The brief speaks of Scootch's notifications only.
5. The Vietnamese lines are new and want a native reader, as the voice does.
