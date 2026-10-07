# Phase 04: pick for me, spoken

Branch `feat/pick-for-me-by-asking`. One task, one pull request. Starts after
phase 01 has merged.

## Context

- "Pick for me" was a chip under the ask; phase 01 removes it. The store still
  has the `pick_for_me` event, `pickForMe` (`state/pick-flow.ts`) and the
  `picked_for_me` stage with "Pick again" and "Fine, that one".
- Jev (`apps/api/src/ai/jev.ts`, through `decide.ts`) answers closed questions
  about a text in under 800 ms, with a fast-tier fallback. `screen-input.ts`
  and `task-create/labels.ts` are the examples.
- `task.create` screens the text first, then picks
  (`apps/api/src/ai/task-create/create-task.ts`,
  `packages/domain/src/contracts/ai-task-call.ts`).
- Tech decisions: the sections on the AI split and on Jev.

## Requirements

- A new choice question, asked of the screened text in `task.create` beside
  the labels: is the person naming something to do, or asking Scootch to
  choose for them ("pick for me", "you choose", "anything", "chọn giúp mình")?
  It is acted on only above a confidence threshold tuned on the eval set, and
  never on a text screened serious or crisis: the care flag wins.
- When it is a request to choose, the response says so and nothing else:
  a new variant `{ kind: 'pick_for_me' }` of the stage-one response. No task,
  no monster, no lines are written and the text is not parked.
- The phone, on that answer: with things in the drawer, it does what the chip
  did (`pickForMe`). With an empty drawer it returns the words to the composer
  with a plain offline-pack line that nothing is parked.
- Offline, and when the model is down: a short phrase list per language in
  `packages/voice/src/offline/` matched on the whole trimmed text, so the
  spoken way works with no server (rule 5).
- A request to choose never uses a start and is never counted.

## Owns

`apps/api/src/ai/task-create/**`, `apps/api/src/routes/` task-create route and
its tests and fixtures, the eval set for the new question under the API's eval
folder, `packages/domain/src/contracts/ai-task-call.ts`,
`ai-task-stages.ts`, `apps/mobile/src/api/task-client.ts`,
`apps/mobile/src/state/{task-flow,task-answers}.ts` and their tests,
`packages/voice/src/offline/**` (the phrase list and the empty-drawer line),
`apps/mobile/src/features/one-screen/stage-shown.tsx` only if the picked
stage's copy needs it.

## Tests

- The eval set for the question, in CI, before it serves anyone: at least 40
  texts per language, with real tasks that contain the words ("pick up the
  parcel", "choose a dentist") as the hard negatives. Zero of those may be
  read as a request to choose.
- Contract test for the new response variant, with a recorded Jev fixture.
- `task-flow.test.ts`: the answer leads to the picked stage; an empty drawer
  returns the words; a serious text is never treated as a request.
- The offline phrase match, both languages.

## Proof

The eval result posted to the bot. A fresh-user walk step: park two things,
then hold and say "pick for me". Read back the stage the app shows.

## Risks

- A real task misread as "choose for me" loses the person's words: the
  threshold errs toward treating text as a task, and the words always come
  back to the composer when nothing is offered.
- The wait: the question runs alongside the labels inside the existing
  budget, not after them.
- Status: in review — pull request #96, not run on a device

## As built

- The request says `canChoose` only when the phone has things parked and nothing set, and the
  server answers `choose` only then: an older build never sees the new verdict, and with an empty
  drawer the words are a task like any other (no extra line needed).
- The phone answers its own phrase list first, online or off; Jev reads the looser wordings of up
  to ten words, at 0.85 or more.
- The eval (`pnpm --filter @scootch/voice eval:choose`, 44 texts a language) is in the CI matrix
  and has not been run against the dev API yet.
