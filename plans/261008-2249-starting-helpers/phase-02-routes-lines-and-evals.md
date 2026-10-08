# Phase 02: Routes, lines and evals

Status: done, evals not yet run against a live model · Tasks: 5 · Needs: 01
Owns: `apps/api/src/ai/task-create/`, `apps/api/src/routes/task-create*.ts`,
`apps/api/src/push/push-lines.ts`, `packages/voice/src/offline/`,
`packages/voice/src/guide/`, `packages/voice/evals/`, `packages/voice/fixtures/`

Goal: Scootch's words for each helper, online and offline, with evals before
any of them reaches a user. Read `docs/tech-decisions.md`: AI routes and evals.

### 1. A time heard in the ramble
- Do: beside `deadlines.ts`, hear a clock time said for today ("dentist at
  3", "call at half two"). The model returns the user's words and the thing;
  the phone works out the clock time, as it does for dates. Ambiguous hours
  resolve to the next one still ahead today.
- Test: recorded fixtures in English and Vietnamese; a time with no thing; a
  time for another day (it is a deadline, not a heard time).
- Status: done — 2547be6

### 2. What is in the way, in the task call
- Do: the request carries the answer to "Anything in the way?" when given. The line brief and the three
  bites follow it: Scary opens with "just open it"; Confusing opens with
  writing the one question; Boring gets more drama; Too big uses the existing
  shrink. Never sent or used on a serious task.
- Test: eval set per answer, both languages; the banned-word check stays green.
- Status: done — 2547be6

### 3. The cue's message
- Do: the day's notifications include one written for the cue, saying the
  cue back in the monster's name (board: "After lunch, you said. I'm
  here."). At each attitude's volume. A serious task gets a plain line.
- Test: eval set; no line counts days or mentions a gap.
- Status: done — 2547be6

### 4. Opening on "next time"
- Do: the pack's opening line for a sitting that has a `nextStart` is plain
  company around the user's own words; the words themselves are shown
  verbatim, never rewritten.
- Test: eval set; the user's line appears unchanged.
- Status: done — 2547be6

### 5. Offline lines
- Do: offline lines in `packages/voice/src/offline/` for each helper, English
  and Vietnamese (written by a native speaker, not translated): the guess
  prompt, the four answers, the cue message, the get-ready nudge ("Dentist at
  3. Time to get ready."), the time said back, the next-time prompt, the
  bites sheet's three notes and the widget's two lines at rest.
- Test: `check.ts` passes every new line at all three attitudes.
- Status: done — 2547be6

## Risks

- A prompt change here can move the voice of the whole task call. Post the
  eval result to the Telegram bot before merge.
