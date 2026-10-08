# Phase 1: the task call adopts a website monster

Effort: high (a cross-package contract and an AI route).

### 1. The request names the monster's page
- Do: `taskCreateRequestSchema` gains an optional `monsterPage` (a shared
  monster's id). Stage one reads that monster when the words pass the screen:
  a monster that exists and is still wild gives stage one its body type, and
  the continuation carries its name, card line, seed and language. An unknown,
  unshared or caught monster changes nothing: the thing hatches as any other.
- A serious, crisis, reject or choose verdict answers exactly as before: the
  page is never read.
- Test: `apps/api/test/task-create-adopts.test.ts`.
- Status: done — see the commit that adds `task-create-adopts.test.ts`

### 2. The name step writes about the monster's own name
- Do: with an adopted monster in the continuation, `/v1/task-create/name` and
  `/v1/task-create/lines` ask the writer for the kind line and the hatch line
  only, told the monster's name. The answer's monster is the website's name
  and card line with that kind line, signed again over the monster's own seed.
  When the writer gives nothing, the offline lines name the same monster.
- The pack is unchanged: it is already written about `monsterName`.
- Test: the same file. The single call (`staged` absent) adopts too.
- Status: done — same commit

### 3. The eval set knows an adopted monster
- Do: the task eval asks for some of its samples with a monster's page and
  checks the name comes back unchanged and the hatch line passes the voice
  check.
- Status: done — see the commit that adds `evals/task-create/adopted.mjs`. Run once against
  dev on 8 Oct 2026: 10 of 10 monsters arrived as themselves, 20 of 20 written
  lines passed the voice check, the name step took a median of 2.0 s

Done when: the tests pass in CI and the eval run on main is green.
