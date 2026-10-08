# Phase 06: Others hunting and odd weeks

Status: not started · Tasks: 4 · Needs: 01
Owns: `apps/api/src/routes/hunting-count.ts`, `apps/api/src/routes/hunting-beat.ts`
(new), `apps/api/migrations/` or a counter object, `apps/mobile/src/api/`,
`apps/mobile/src/features/session/screens/working-footer.tsx`,
`packages/domain/src/rewards/` (odd weeks), `apps/mobile/src/features/session/catch/`,
`apps/mobile/src/features/monster/`, `apps/mobile/src/features/privacy/`,
`apps/web/src/` (privacy page), `docs/undesigned-states.md`

Board: sections 06 and 07, and the rule card "Odd week rules".

Goal: company without strangers, and surprise that does not wear out.

### 1. Counting, on the server
- Do: a beat when a session starts and when it ends, carrying nothing but the
  device's existing auth. The server keeps a count that forgets a beat after
  the longest session length. One route reads the number. Rate limited per device.
- Test: start and end; a start with no end expires; a serious or crisis
  session sends no beat.
- Status: done — 591c3de

### 2. The line in the session
- Do: in the working footer, "214 are hunting something right now",
  rounded and refreshed once a minute. Absent offline, on a serious task,
  under 20 people, at a table, and when switched off by a new row in
  Settings.
- Status: not started

### 3. Privacy
- Do: the privacy page in the app and on the website say what a beat sends
  and keeps, and match the code.
- Status: not started

### 4. Odd weeks
- Do: a rule on the phone that turns about one week in six odd, from the
  user's own history and a seed: at most one odd hatch and one odd catch that
  week. Each variation is one file in a folder. The board draws two: a tiny
  hatch (three small monsters; the card's name gains a word, "Molar (tiny)")
  and a ninth catch, the teacup ("Tip the cup · Drag it down over him"),
  which after its first turn joins the usual roll. "Catch with: Tap twice"
  stays. No badge, banner, sound or list of odd finds. No schedule, no
  announcement, no purchase. A serious task is never varied. The same history
  always gives the same weeks, so a restore changes nothing.
- Test: the rule is stable for a history; never two odd weeks running; none
  in the first three catches.
- Status: not started

## Risks

- A tiny count reads as loneliness. Under the floor the line is absent, not
  "0".
