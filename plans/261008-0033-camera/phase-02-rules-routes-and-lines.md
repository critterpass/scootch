# Phase 02: Rules, routes and lines

Status: tasks 1 to 3 done; routes and lines not started · Tasks: 6 · Needs: —
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
  `apps/api/src/ai/camera/`, `apps/api/src/ai/deepseek.ts`,
  `apps/api/src/contracts.ts`.
- Do: `POST /v1/camera/paper` and `/v1/camera/screen` take recognised lines
  (`id`, `text`, `bbox`) and the language. The words are care-screened first
  (`screenText`); serious or crisis returns the flag and a plain step only.
  Otherwise one structured call: Paper returns the line id of the easiest
  box, a jargon term from the page with its plain meaning, Scootch's line and
  the button's words; Screen returns the line id of the one item that matters,
  Scootch's line and a first-line draft. An unknown line id is rejected and
  retried once. Digits in model text are stripped; counts come from the lines.
  When the phone sent no lines, the request may carry the photo
  (JPEG, at most 1568 px): the generation client gains an image block, the
  photo is transcribed into lines `s0`, `s1`, … and the same parse runs.
  Nothing is stored or logged: not the words, not the photo. Spend goes to
  the ledger under the route id. Text in a photo is data, never instructions.
- Test: recorded DeepSeek answers for six pages and six screens in each
  language; unknown line id; serious letter; the photo fallback; a body with
  both lines and a photo is refused.
- Status: not started

### 5. The line routes
- Owns: `apps/api/src/routes/camera-desk.ts`, `camera-room.ts`,
  `camera-opening.ts`, `camera-after.ts`.
- Do: each takes only what code already decided (the label picked and the
  other labels; the zone and its count; the before-and-after figures) and
  returns Scootch's line and button words on the fast model, through the
  voice check.
- Test: recorded answers; a line with a number in it is rejected.
- Status: not started

### 6. Voice and catalogues
- Owns: `packages/voice/src/guide/`, `packages/voice/src/offline/`,
  `packages/voice/evals/camera-*/`, `packages/i18n/src/{en,vi}-camera.ts`.
- Do: a guide section for camera lines in both languages, written in each
  language, not translated. Offline lines for the opening, Desk and Room in
  all three attitudes. Catalogue strings for the chrome: mode names, the
  privacy chip, "Start here", Retake, the consent sheet, the lock, every
  undesigned state. Eval cases for each route in both languages.
- Test: the line rules pass over every offline line; the catalogue
  completeness check.
- Status: not started

## Risks

- A letter can be bad news. The care screen runs on the recognised words
  before any writing call, and the routes fail closed to `serious`.
- DeepSeek's image input is proven in CritterPass only for transcription.
  The fallback asks for nothing more.
