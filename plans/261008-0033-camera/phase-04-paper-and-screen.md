# Phase 04: Paper and Screen

Status: built and tested off a phone; never run on a device or against the live model · Tasks: 5 · Needs: 03
Owns: `apps/mobile/src/features/camera/` (paper, screen, consent),
`apps/mobile/src/features/privacy/`,
`apps/mobile/src/screens/registry/camera-*.tsx`,
`apps/web/src/` (the privacy table), `docs/tech-decisions.md` section 2,
`docs/undesigned-states.md`

Goal: the two Plus modes, asked for honestly and locked quietly. Board
screens: "Paper · one box at a time · Plus", "First Paper scan · asks
first", "Screen · the one email · Plus". High effort for tasks 1 and 2.

### 1. The consent sheet
- Do: before the first Paper or Screen read leaves the phone, the sheet says
  what is sent (the words read from the photo; the photo itself only when the
  phone cannot read it), that nothing is kept and nothing trains a model, and
  that Desk and Room stay on the phone. "Read it" allows; "Not now" sends
  nothing and returns to the viewfinder. The board's words say "this photo":
  log the change of wording as an undesigned state.
- Test: nothing is sent before "Read it"; "Not now" spends no free try.
- Status: built — 0335637; not run on a device

### 2. The lock
- Do: Paper and Screen chips read the domain's answer: open, free try, or
  locked. Locked is the quiet lock on the chip; tapping it opens the Plus
  sheet through the existing sheet controller, which already refuses on a
  heavy day and during a session.
- Test: the house-rules check covers the camera; one try each, then locked.
- Status: built — 0335637; not run on a device

### 3. Paper
- Do: numbered boxes drawn on the recognised lines, the chosen one lit,
  "Box n only", the document's name, Scootch's line, the jargon card,
  "Explain more" (one further call) and the main button, which sets the task.
  A poor photo (blurry, glare, cut off) asks for a retake in plain words.
- Status: built — 0335637; not run on a device

### 4. Screen
- Do: the chosen row lit and the rest dimmed, the count of rows read,
  Scootch's line, the first-line card with "Copy line" (clipboard), and the
  main button, which sets the task and names the monster as any task does.
- Status: built — 0335637; not run on a device

### 5. Serious, privacy and sheets
- Do: a read flagged serious or crisis shows the step in plain company: no
  joke, no monster name on the button, no before-and-after. Add the camera
  rows to the privacy page in the app and the table on the website, and to
  `docs/tech-decisions.md`; remove the "Camera rows left out" row from
  `docs/undesigned-states.md`. Registry files and sheets for: each board
  screen, locked, free try, poor photo, nothing readable, offline (Paper and
  Screen say they need a connection), serious, largest text.
- Done when: sheets in both languages; the privacy page matches the routes.
- Status: built — 0335637; not run on a device

## Risks

- A photographed screen reads worse than paper. "Nothing readable" must be a
  calm state with a retake, and must not spend the free try.
