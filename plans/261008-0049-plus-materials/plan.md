# Plus, in real materials

Status: in progress · Created 8 Oct 2026 · Board:
[Scootch - Plus Materials](../../design/Scootch%20-%20Plus%20Materials.dc.html)
(nine screens, listed in `design/screens.json`).

The founder replaced the Plus sheet, the purchase moments, the shelf, the
manage page and the share cards with this board on 8 Oct 2026. Read
[product-brief.md](../../docs/product-brief.md) sections 2, 6, 7 and 9 before
any task here.

## What replaces what

| Board | Replaces | Stays |
|---|---|---|
| Seven finishes: Paper, Holo foil, Chrome, Jelly, Frosted glass, Velvet, Riso | Standard, Kraft, Gold, Night, Riso | The caught card's own layout |
| The sheet, dressed up | The Plus sheet | Its rules, its line slots, its small print |
| Welcome · the card arrives | Trial started, the lifetime moment | The lifetime lighthouse line |
| The studio: ink, finish, trail | The shelf; the finish picker under an open card | — |
| Your card | The manage page | Change plan, restore and cancel through Apple's sheet |
| Story, trading card, sticker sheet, receipt, poster | "Show someone" story and "Share a card" | A card's page on the website |

Locked controls, the first offer, the trial's last day and renewal-off are
not on this board and do not change.

## Decided 8 Oct 2026 (founder)

| Decision | Choice |
|---|---|
| How finishes are sold | Plus wears every finish. Without Plus a finish is bought singly. Inks and trails are single purchases for everyone |
| Wallet pass, tilt video, Messages stickers, ink on widgets | Built now, in a native batch branch |
| The member number | The server hands out the next number on first purchase; the card shows the year alone until it arrives |
| How it is built | One branch off main, one commit per phase |

## Decided by the build

| Decision | Choice | Why |
|---|---|---|
| A finish is worn, not set per card | The studio's finish dresses every card, the member card and everything shared. A card's stored finish is the one worn when it was caught and is what its page on the website shows | The board: "pick one in the studio and it carries through" |
| Cards caught in a finish that is gone | Standard and Kraft read as Paper, Gold as Holo foil, Night as Velvet, where they are read | No stored row is rewritten |
| How a material is drawn | The drawing model gains one command, a gradient or grain fill with a blend mode. A finish is data; every backend (Skia, SVG, canvas) replays it | The board builds each finish "from light rather than pictures" |
| The name on the member card | The account's name when there is one; the line is left off otherwise | There is no other name |
| Prices | The store's own text, always. The board's dollar figures are the products' intended tiers | House rule |
| The receipt's and poster's fixed words | Labels, in both languages, beside the card's labels. Scootch's own sentence on the poster comes from the line packs | No spoken line is hard-coded in a screen |

## Phases

| # | Phase | Needs | Branch kind |
|---|---|---|---|
| 01 | [Finishes as materials](phase-01-finishes-as-materials.md) | — | JavaScript |
| 02 | [What is sold and what is worn](phase-02-sold-and-worn.md) | 01 | JavaScript |
| 03 | [The sheet and the welcome](phase-03-sheet-and-welcome.md) | 01 | JavaScript |
| 04 | [The studio](phase-04-studio.md) | 02 | JavaScript |
| 05 | [Your card and the member number](phase-05-your-card.md) | 02 | JavaScript, API |
| 06 | [Made to share](phase-06-made-to-share.md) | 02 | JavaScript |
| 07 | [Native batch: Wallet, tilt video, stickers, widget inks](phase-07-native-batch.md) | 05, 06 | native batch |

## Done when

- A fresh user with no seed taps a locked control, sees the dressed-up sheet,
  buys yearly in the sandbox, sees the card arrive, picks a finish and finds
  it on the member card and on a shared story, on a device run.
- A free user buys one finish in the sandbox and wears it; a second finish
  still shows its price.
- No route sells anything from first launch, the one screen, a session or
  "Done for today"; the sheet says nothing on a day with something heavy in it.
- A serious or private task is on no story, card, sticker sheet, receipt or
  poster, and a crisis day offers none of them.
- Sheets of every touched screen sit beside their design, in both languages,
  both appearances and at the largest text size.
