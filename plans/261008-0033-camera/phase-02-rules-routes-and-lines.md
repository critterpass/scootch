# Phase 02: Rules, routes and lines

Status: done except the evals · Tasks: 6 · Needs: —
Owns: `packages/domain/src/camera/`, `packages/domain/src/entitlements/`,
`apps/api/src/routes/camera-*.ts`, `apps/api/src/ai/camera/`,
`apps/api/src/ai/deepseek.ts`, `apps/api/src/contracts.ts`,
`packages/voice/src/guide/`, `packages/voice/src/offline/`,
`packages/voice/evals/camera-*/`, `packages/i18n/src/{en,vi}-camera.ts`

Goal: everything the camera decides and says, with no screen. Read
`docs/tech-decisions.md` section 2. High effort for tasks 2 and 4.

### 1. Picking the step
- Owns: `packages/domain/src/camera/`.
- Do: pure functions over what the phone recognised.
  Desk: from the things found, the one that leaves fastest (small, single,
  portable label family first; ties go to the nearest the frame's edge).
  Room: the four corners of the photo; hand over the non-empty one with the least in it;
  "Bigger zone" steps to the next. Nothing found, too dark and one thing only
  are outcomes, not errors.
- Test: fixed inputs for each rule; a property test that the pick is always
  one of the things given and a zone always lies inside the frame.
- Status: done — b7ecf13

### 2. Plus and the free try
- Owns: `packages/domain/src/entitlements/`, `packages/domain/src/camera/`.
- Do: add `paper_camera` and `screen_camera` to `PLUS_ONLY`. One function
  answers, for a mode, a purchase state and the tries used: open, free try,
  or locked. A try is spent when a scan returns a step, not when the camera
  opens, and not when the scan failed or was refused consent.
- Test: every purchase state by every mode by tries used; a failed scan and
  a declined consent spend nothing; Desk and Room are open in every state.
- Status: done — b7ecf13

### 3. Consent
- Owns: `packages/domain/src/camera/`.
- Do: consent to send words out is given or not given. Paper and Screen
  cannot call a route until it is given; "Not now" changes nothing, so the
  sheet returns next time; Settings can take it away again. Desk and Room
  never need it.
- Test: no history of answers lets words be sent unless the last answer was
  a yes.
- Status: done — b7ecf13

### 4. The reading routes
- Owns: `apps/api/src/routes/camera-paper.ts`, `camera-screen.ts`,
  `apps/api/src/ai/camera/`, `packages/domain/src/contracts/camera.ts`.
- Do: `POST /v1/camera/paper` and `/v1/camera/screen` take the recognised
  lines (`id`, `text`) and the speaker. The words are care-screened first;
  serious or crisis returns the verdict alone. Otherwise one structured call:
  Paper returns the boxes and the easiest one by line id, the page's name, a
  hard word printed on the page with its plain meaning, Scootch's line, the
  button's words and the task; Screen returns the one line that matters, a
  first-line draft, and the same three texts. An id the phone did not send is
  dropped; a pick that is not a line is asked for once more, then answered as
  unreadable. Any text with a digit in it is refused: counts come from the
  phone. Nothing is stored or logged. No photo is accepted.
- Test: doubles shaped like recorded answers at the provider boundary:
  ordering and unknown ids, the hard word, serious and crisis, unscreened
  words, an unknown pick, a silent writer, nothing logged.
- Status: done — SHA

### 5. The line routes
- Owns: `apps/api/src/routes/camera-desk.ts`, `camera-room.ts`.
- Do: each takes only what the phone already decided (the names of the
  ringed thing and the others; where the lit corner is and what is in it) and
  returns Scootch's line, the button's words and the task on the fast model,
  through the voice check, one retry, then Scootch's offline line. They answer
  even when no model does. The opening line is an offline line (no route).
  The before-and-after line is written with phase 05.
- Test: the same doubles; a line with a number in it is refused.
- Status: done — SHA

### 6. Voice and catalogues
- Owns: `packages/voice/src/offline/`, `packages/voice/evals/camera-*/`,
  `packages/i18n/src/{en,vi}-camera.ts`.
- Do: offline lines for the opening, Desk and Room in all three attitudes and
  both languages (done with the routes). Catalogue strings for the chrome are
  written with the screens that use them (phases 03 to 05). Eval cases for
  each route in both languages need live calls with the dev key.
- Test: the line rules pass over every offline line.
- Status: partly done — SHA; evals not written

## Risks

- A letter can be bad news. The care screen runs on the recognised words
  before any writing call, and the routes fail closed to `serious`.
- The routes are tested against doubles, not live answers: how well DeepSeek
  picks a box or an email is unmeasured until the evals run.
