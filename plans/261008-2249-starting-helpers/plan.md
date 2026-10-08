# Starting helpers

Status: planned, nothing built · Created 8 Oct 2026 · Board:
[Scootch - Starting Helpers](../../design/Scootch%20-%20Starting%20Helpers.dc.html),
eight sections, 22 screens and three rule cards. Board-to-plan map: [board-map.md](board-map.md)

Ten small helpers for starting and returning, accepted by the founder on
8 Oct 2026. Evidence and app comparisons:
[research backlog](../reports/research-261008-1931-adhd-feature-ideas-report.md).
Read [product-brief.md](../../docs/product-brief.md) sections 2 and 6 before
any task here.

## What it is

| Helper | What the user sees | Why |
|---|---|---|
| Guess and real | "How long would this take?" before Start; the card and story say "Thought 2 hours. Took 11 minutes." | Dread inflates size; time misjudgement |
| Ends at | "Ends at 3:42" under the length wheel | Time blindness |
| When | Now, "After ___" or a time; the monster's message arrives then and says the cue back | If-then plans, g = 0.31 |
| In the way | "Anything in the way?" Boring, Scary, Confusing or Too big, under the battery; it changes the first bite and the lines | Procrastination as mood repair |
| Bites on request | The three bites can be opened from the set task, not only from a notification | The one-job-instantly lesson |
| Next time, start with | One line left on "not finished"; it opens the next sitting and is its first bite | Resuming is the second-hardest start |
| Waiting mode | "Dentist at 3" in the ramble: one thing that fits the gap, a length that ends in time, one get-ready nudge | Hours lost before an appointment |
| Others hunting | "214 are hunting something right now", no names | Body doubling without moderation |
| Odd weeks | Rare, unannounced changes to hatch and catch (tiny monsters, a ninth catch) | Novelty wears off in 2 to 3 weeks |
| Scootch every day | The small and medium widgets show Scootch at rest on a day with nothing waiting | Presence on the Home Screen drives return |

## Decided

| Decision | Choice | Why |
|---|---|---|
| Every helper is optional | No helper blocks Start; untouched, the day loop is exactly as today | Rule 1: one action |
| Numbers | Guess, real minutes, end time, the gap and the live count are computed by code. The model writes words only | As the camera plan |
| Care | A serious task gets no guess line on a card (it has no card), no ick chips, no cue in a monster's voice, no count. A crisis day shows none of these | Brief section 6 |
| Voice | A guess that was too short is printed with no comment. No helper counts days, gaps or misses | Rule 2 |
| Waiting mode permissions | Only a time the user said or typed. No Calendar, no Location | Calendar is on the after-launch list |
| Live count | A number only. No names, labels, ranks or history | Rule 4; no moderation needed |
| Odd weeks | Earned by nothing, sold never, on no schedule, never announced ahead | As surprise drops |
| Where the board is out of date | The board draws a "Treat after this" row and three length pills (10, 25, 50). Neither is built: the treat was removed on 7 Oct and the length is the wheel. "Ends at" sits under the wheel; the dock is the chips and Start | Brief section 3 wins over a board |
| Banned word on the board | The story draws "I finally emailed the dentist." The app prints the website's three lines, and the guess line after them | Brief section 11 |
| Nothing is learned | "After lunch" and the get-ready lead (35 minutes) are fixed defaults the user can change. The board's "follow your days" and "learned for you" wait for the Scootch that learns you | That is a Plus feature with its own scope |
| Guess is private until shared | The sheet's "Only you see it" becomes "A guess, before you start." because the story carries it, with one toggle to take it out | The line must be true |
| Not here | A treat during the session (the treat was removed on 7 Oct); the Watch app (after launch) | Founder decisions stand |

## Phases

| # | Phase | Tasks | Needs | Branch kind |
|---|---|---|---|---|
| 01 | [Rules and stored fields](phase-01-rules-and-stored-fields.md) | 7 | — | JavaScript |
| 02 | [Routes, lines and evals](phase-02-routes-lines-and-evals.md) | 5 | 01 | JavaScript |
| 03 | [The set task: guess, ends at, when, the ick, bites](phase-03-the-set-task.md) | 5 | 01, 02 | JavaScript |
| 04 | [Finish and return: guess on the card, next time](phase-04-finish-and-return.md) | 4 | 01, 02 | JavaScript |
| 05 | [Waiting mode](phase-05-waiting-mode.md) | 3 | 02, 03 | JavaScript |
| 06 | [Others hunting and odd weeks](phase-06-others-hunting-and-odd-weeks.md) | 4 | 01 | JavaScript |
| 07 | [Scootch every day on the widgets](phase-07-scootch-every-day-widgets.md) | 2 | — | native batch |

Order of value: 01, then 03 and 04 (guess and real, ends at, next time, when),
then 05, then 06. Phases 03 and 04 share no screen files and can run side by
side once 02 has merged. Phase 07 changes Swift in a widget extension, so it
waits for the next native batch.

## Done when

- A fresh user with no seed sets a thing, guesses, picks "After lunch",
  starts, ends not finished, leaves a line, and on the next sitting sees that
  line first; then catches it and the card reads guess and real. On a device run.
- All of it works in aeroplane mode except the cue's written line and the
  live count, which are absent offline.
- A serious task shows none of the helpers that carry a joke or a number.
- "Dentist at 3" typed at 11:00 offers a length that ends before the
  get-ready time, and one nudge goes out, inside quiet hours rules.
- Every AI route change has its eval set green in CI, the care set with no miss.
- Design-beside-device sheets for every touched screen, both languages,
  largest text, keyboard open, offline; each undesigned state logged.

## Risks

- **Clutter on the one screen.** Three new optional asks sit near Start.
  They share one row of chips in the task-set dock; nothing opens by itself.
- **The cue's time.** "After lunch" has no clock time. The user picks from
  day moments with a default hour each, changeable once in the sheet.
- **Notification budget.** A cue and a get-ready nudge count inside the
  attitude's daily limit and spacing; they replace a message, never add one.
- **Stored rows.** New fields are optional and nullable so older rows and
  backups still read.

## Answered by the founder, 8 Oct 2026

| Question | Answer |
|---|---|
| States the board does not draw (Vietnamese, largest text, keyboard, offline, serious) | Built from the same components and logged in `docs/undesigned-states.md` |
| Guess sheet copy | "A guess, before you start." in place of "Only you see it" |
| "You, yesterday" | Shown only the day after; no label on any later day |
| The live count's beat | Accepted, with its line in the privacy page (phase 06, task 3) |
| The widget at rest | Opens the world, as the board draws |
| The product brief | The helpers go into sections 3 and 5 once phase 01 merges (phase 01, last task) |
