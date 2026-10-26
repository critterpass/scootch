# Contracts

The shapes every lane builds against, as zod schemas with inferred types.
Import them from `@phusclass/domain` through `index.ts`.

| File | What it holds |
|---|---|
| `common.ts` | Language, attitude, energy, the care verdict, date strings, ids and the wire error |
| `ai-routes.ts` | The `aiRoutes` map: one request and one response schema per route the server serves |
| `ai-task-call.ts` | `task.create`, the one call per task, and its line packs |
| `ai-task-stages.ts` | The same call in stages: `task.create_start` (fast), then `task.create_lines`, or `task.create_name` and `task.create_pack` |
| `ai-small-routes.ts` | Shrink, bargain, stuck help, pick for me, morning line, weekly sentence |
| `ai-labels.ts` | `screen.input` and the typed decisions (size, energy, share) |
| `local-db.ts` | The phone's tables, one row schema each, with derived fields marked |
| `plus.ts` | The id the store knows this phone by, for tuition |

Recorded fixtures live in `packages/voice/fixtures/` as
`<route id>.<language>.json`, with `<route id>.<case>.<language>.json` for a
second recording (`serious`, `crisis`). Each is `{route, case?, request,
response}` and parses with that route's schemas. The Vietnamese ones are
written in Vietnamese, not translated.

## Reading the care flag

`screen.input` and `task.create` return a verdict. The phone stores it on the
task (`screen` in `local-db.ts`) and every screen checks that stored flag. A
serious task has no act, joke, grade, fuse, share or burst. A crisis text is never
stored as a task.

## When a contract does not fit

A lane that needs a field added, renamed or loosened follows three rules:

1. **Stop.** Do not work around the contract with a cast, a private copy of
   the type or an extra field.
2. **Report.** End the pass with `NEEDS_CONTEXT`, naming the schema, the
   change and the reason.
3. **Never edit a contract from a feature lane.** Contracts and their
   fixtures change together, in their own pull request, so the other lanes
   see the change before they build on it.
