# Scootch: agent contract

Binding for every coding agent. The reasons are in [docs/workflow.md](docs/workflow.md).

## Read before coding

1. [docs/product-brief.md](docs/product-brief.md) sections 2 and 6 (the rules that never bend, and care).
2. Your phase file in `plans/261006-2350-scootch-full-build/`, then your task.
3. Only the sections of [docs/tech-decisions.md](docs/tech-decisions.md) your task names.
4. For interface work: the board and renders your task names under `design/`.

Precedence: product brief > phase file > design board > older notes.

## How to work

- **One lane, one task.** Finish it, prove it, commit, report, stop. Your brief
  has a time box; if you will exceed it, stop and say why.
- **Owns list.** Change only the files your task lists. Needing anything else:
  stop and report `NEEDS_CONTEXT`.
- **Never wait in your turn.** Push, dispatch, report the run id, stop.
- **Tests.** Locally run only the test file for what you changed
  (`pnpm --filter @scootch/<pkg> test -- <file>`). CI runs the suites. Write a
  test only where it protects behaviour: money, permissions, the care screen,
  state machines, sync, external contracts. No snapshot tests.
- **Real behaviour only.** Test doubles only at network boundaries, with
  recorded fixtures. Never weaken a test to make it pass.
- **Registries are folders.** A new screen, work mode, monster body, AI route
  or bot command is one new file. Never edit a shared list by hand.
- **No ids in code.** No plan, phase or task ids in code, comments, test names
  or commits. No "MVP", "v2" or "later" for designed behaviour.
- **Undesigned states** are built from existing components and logged in
  `docs/undesigned-states.md` (screen, state, reason).

## Scootch's voice, in code

- Copy that Scootch speaks is never hard-coded in a screen. Online lines come
  from the AI routes; offline lines come from `packages/voice/offline/`.
- No line may be about the user's worth, count missed days or mention a gap.
- A task flagged serious or crisis gets no monster, joke, card, share or burst.
  Check the flag; do not re-derive it.

## This Mac

- No full typecheck, lint or test suites locally. No Docker. No simulators or
  emulators. Device runs are GitHub Actions only.
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

- A pull request that touches a screen ships design-beside-device sheets of
  every touched screen, including long text, the largest text size, keyboard
  open, empty and offline states.
- Add or extend the fresh-user walk for your flow. No seeded shortcuts.

## Secrets

- Only `.env.example` files are committed. `certs/` is ignored.
- List variable names only. Never print a value.

## Commits and pull requests

- Branch `feat/<area>-<behaviour>`, conventional commits, one commit per task.
- One pull request per lane per cycle. Merge with `gh pr merge --auto --squash`.
  No `--watch`, no polling loops.
- No AI references, session links or attribution lines in commits or bodies.

## Status

Tick the task in the phase file: `- Status: done — <short sha>` or
`blocked — <reason>`. End every pass with:

```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: one or two sentences
Evidence: test output, run id or sheet path; and what was not checked
Concerns/Blockers: optional
```
