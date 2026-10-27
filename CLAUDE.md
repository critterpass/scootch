# Phu's Class

Project rules for every coding agent.

## Read before coding

1. [docs/product-brief.md](docs/product-brief.md) sections 2, 4 and 6 (the rules that never bend,
   Thầy Phú, and care).
2. [plans/261027-phus-class/plan.md](plans/261027-phus-class/plan.md) and
   [docs/tech-decisions.md](docs/tech-decisions.md) where they touch your change.
3. For interface work: the boards for the screen under [design/phus-class/](design/phus-class/)
   (its README maps every board). Build from the markup a board renders, not from script values
   no template uses.

Precedence: product brief > plan > design board > older notes. The Scootch boards in `design/` and
the plans before `plans/261027-phus-class/` are history, not instructions.

## How to work

- **Tests.** Locally run only the test file for what you changed
  (`pnpm --filter @phusclass/<pkg> test -- <file>`). CI runs the suites. Write a
  test only where it protects behaviour: money, permissions, the care screen,
  state machines, sync, external contracts. No snapshot tests.
- **Real behaviour only.** Test doubles only at network boundaries, with
  recorded fixtures. Never weaken a test to make it pass.
- **Registries are folders.** A new screen, pose, prop, AI route or bot command
  is one new file. Never edit a shared list by hand.
- **No ids in code.** No plan, phase or task ids in code, comments, test names
  or commits. No "MVP", "v2" or "later" for designed behaviour.
- **Undesigned states** are built from existing components and logged in
  `docs/undesigned-states.md` (screen, state, reason).

## Thầy Phú's voice, in code

- A line Thầy Phú says is never hard-coded in a screen. Online lines come from
  the AI routes; offline lines come from `packages/voice/src/class/`, written per
  language. Interface words (buttons, labels) come from `packages/i18n`.
- Relentless about the task, never about the person: no line speaks to the
  user's worth, intelligence, body or past, compares them to anyone, counts
  days the app was not opened, or mentions time away.
- Words he never uses: lazy, failed, stupid, disappointed, behind, missed,
  again, finally, streak, absent. The Vietnamese list is its own, written by a
  native speaker. `packages/voice/src/class/check.ts` enforces both; every line
  passes it before it is shown.
- A task flagged serious or crisis gets no act, joke, grade, fuse, tally,
  thrown chalk, late slip, share, burst or happening. Check the stored flag; do
  not re-derive it.

## This Mac

- No full typecheck, lint or test suites locally. No Docker. No Android emulator.
- iOS flows run on the local simulator only through
  `tools/scripts/device-ios-local.sh <flow or folder>`: one shared simulator,
  queued, erased each run. Prove device behaviour there, not with GitHub device runs (too slow).
  Never create another simulator.
- Installs go through `tools/scripts/lane-install.sh`.
- Kill only a process id you started. Never `pkill -f` or `killall`.
- Never `git stash`. Never fetch run screenshots into the repository.
- Temp files in `<scratchpad>/<branch>/`. Never delete a file you did not create.
- Shell is zsh: arrays or `${=list}` to split; compare times as numbers.

## Native

- Native changes (anything that alters the fingerprint: targets, entitlements,
  native modules, `app.config.ts` native fields) land only in a native batch
  branch, never on main between batches.
- Native builds run on GitHub's runners:
  `gh workflow run native-build.yml -f ref=<branch> -f profile=e2e-test` (the
  simulator app; iOS device runs find it by native fingerprint) or
  `-f profile=dev -f submit=true` (signed, straight to TestFlight). See
  `e2e/README.md`.
- An EAS cloud build is the fallback and needs the founder's approval.
- A JavaScript-only change never needs a build: device runs swap the commit's
  JavaScript into the existing `e2e-test` build.

## Interface work

- A pull request that touches a screen shows the touched screens beside their boards
  (design-beside-device sheets), including the largest text size and keyboard open.
- Add or extend the fresh-user walk for your flow (`e2e/fresh/`). No seeded
  shortcuts.

## Secrets

- Only `.env.example` files are committed. `certs/` is ignored.
- List variable names only. Never print a value.

## Commits and pull requests

- Branch `feat/<area>-<behaviour>` or `fix/...`, conventional commits.
- Merge with `gh pr merge --auto --squash`.
- No AI references, session links or attribution lines in commits or bodies.
