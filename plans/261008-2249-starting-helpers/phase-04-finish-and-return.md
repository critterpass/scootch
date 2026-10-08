# Phase 04: Finish and return

Status: not started · Tasks: 4 · Needs: 01, 02
Owns: `apps/mobile/src/features/session/screens/not-finished-screen.tsx`,
`apps/mobile/src/features/session/screens/working-screen.tsx`,
`apps/mobile/src/features/zoo/` (the card), `apps/mobile/src/features/share/`
(story), `apps/mobile/src/features/reveal/` (card reveal),
`apps/mobile/src/screens/registry/session-next-time*.ts`,
`apps/mobile/src/screens/registry/zoo-card-guessed.tsx`, `apps/web/src/` (the
shared card's page), `docs/undesigned-states.md`

Board: sections 03 and 04, and the rule card "The stat line".

Goal: the guess pays off at the catch, and an unfinished sitting leaves a way
back in.

### 1. Guess and real on the card
- Do: a caught card whose monster has a guess prints one line under its
  stats, in the stats' mono: "Thought 2 hours. Took 11 minutes." Always
  those two sentences in plain units; never faster, slower, only, just, a
  colour change or a score of guesses. No guess, the card is as today. A guess shorter than the
  real time is printed the same way, with nothing added.
- Test: the card's stat line for no guess, shorter, longer.
- Status: not started

### 2. On the story and the card's page
- Do: the share story prints the line under the headline when there is a
  guess, the same type and colour whichever way it went. One toggle in the
  share composer takes it out. The headline stays the website's three lines,
  not the board's "I finally…". The website's card page prints
  the same line from the same signed values.
- Status: not started

### 3. Leaving a line
- Do: on "not finished", after Carry on tomorrow, a sheet: "Next time,
  start with…", "Optional. I'll show it to you first next time, word for
  word.", one field typed or held to say, "Save for tomorrow" and Skip. Reuses the park composer. Not
  offered after Let go; cleared by Make smaller.
- Status: not started

### 4. Opening on it
- Do: the next sitting on that task opens on the user's line, verbatim,
  before any line of Scootch's, and it is the first bite. After the first
  minute it folds away into the usual session. The label "You, yesterday"
  shows only when it was written the day before; otherwise no label. The lurker's widget and notification are
  unchanged.
- Done when: sheets both languages, largest text, keyboard open, offline;
  the fresh-user walk leaves a line and sees it on the next sitting.
- Status: not started
