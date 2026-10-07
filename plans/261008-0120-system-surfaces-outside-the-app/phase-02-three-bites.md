# Phase 02: Three bites

Owns: `packages/domain/src/contracts` (the task call), `apps/api` (the task
route and its evals), `apps/mobile/src/state` (bites). High effort: an AI
contract.

### 1. The task call writes them
- Do: three steps for the task, each under five minutes with its minutes, in
  the same call that writes the lines. None for a serious task. Offline there
  are none until the task has been screened.
- Test: the eval set gains bites: three, each small, none on a serious task,
  none of the words Scootch never uses, in both languages.
- Status: done — see the commit that adds `packages/domain/src/hunt/bites.ts`. The eval's new check has not been run against a real model, and the Vietnamese brief for bites has not been read by the founder

### 2. Ticking one
- Do: a ticked bite is kept with the task, shrinks its monster by a third and
  earns nothing. The last one opens the catch.
- Test: tick order, a bite ticked twice, the last bite, a task let go.
- Status: done — same commit. The tick is kept and the monster shrinks; opening the catch after the last bite is wired where the notification's actions are handled
