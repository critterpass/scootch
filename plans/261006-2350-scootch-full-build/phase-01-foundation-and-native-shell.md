# Phase 01: foundation and native shell

Status: not started · Tasks: 11 · Needs: 00

Goal: a repository where three lanes can work without colliding, a pipeline
that proves work on devices without this Mac, and a first native build that
never needs rebuilding for a launch feature.

Two lanes: A owns tasks 1 to 6 and 11, B owns tasks 7 to 10.

## Lane A: repository and pipeline

### 1. Workspace
- Owns: root config, `packages/*/package.json`, `apps/*/package.json`.
- Do: pnpm workspace, TypeScript strict, lint, prettier, the folder layout in
  plan.md, `@scootch/<dir>` packages exporting source.
- Done when: CI installs and typechecks an empty workspace.
- Status: done — 32bab2f

### 2. CI
- Owns: `.github/workflows/ci.yml`.
- Do: one gate job that rolls up typecheck, lint, format, unit tests, the
  no-ids check and the eval suites. Auto-merge on, squash, branches deleted.
- Done when: a trivial pull request merges itself on green.
- Status: done — e2b3d5b

### 3. Device pipeline
- Owns: `.github/workflows/device.yml`, `tools/scripts/capture-*`, `e2e/README.md`.
- Do: port the CritterPass device workflow. Android on Linux runners is the
  default; iOS only for system surfaces. Screenshots are run artifacts and a
  pull request comment, never a git branch.
- Done when: a flow runs on Android against an `e2e-test` build with the
  commit's bundle swapped in, and posts sheets to a pull request.

### 4. Screen registry and sheets
- Owns: `apps/mobile/src/screens/registry/`, `tools/scripts/compare-sheets.ts`.
- Do: one file per screen state; a generated index; a sheet that puts each
  design render beside its device capture. States per screen include long
  text, largest text size, keyboard open, empty and offline.
- Done when: a sample screen appears in a sheet next to its render.

### 5. Generated registries
- Owns: `tools/scripts/generate-index.ts`.
- Do: the generator used by screens, work modes, monster bodies, AI routes and
  bot commands. Generated files are ignored by prettier and never hand-edited.
- Done when: adding a file to a registry folder needs no other edit.
- Status: done — 32bab2f

### 6. Contracts
- Owns: `packages/domain/src/contracts/`, `packages/voice/fixtures/`.
- Do: the types three lanes build against: the art components' props, every AI
  route's request and response, the local database schema, the table messages.
  One recorded fixture per AI route.
- Done when: phases 02, 03 and 04 can each start from these files alone.
- Status: done — 6369334

## Lane B: native shell

### 7. App shell
- Owns: `apps/mobile` config and root layout.
- Do: Expo app on the founder's EAS project, router, tokens, the one-screen
  skeleton with a placeholder critter, expo-sqlite, over-the-air updates on
  two channels (dev and prd), the `e2e-test` variant. Two environments only.
- Done when: it runs in the device pipeline.

### 8. Every target and capability
- Owns: `apps/mobile/targets/`, `apps/mobile/app.config.ts`.
- Do: widget, Live Activity, control, notification-service and App Clip
  targets as stubs; every entitlement in tech-decisions section 4; the native
  modules for speech, haptics, iCloud key-value storage, purchases, Sign in
  with Apple and App Intents.
- Done when: the build signs with every capability, and each stub shows a
  placeholder on a device.

### 9. First native build
- Do: cut native batch one, submit to TestFlight, publish one over-the-air
  update and confirm it arrives on that build.
- Done when: the Native batch one gate passes.

### 10. Fresh-user walk, step one
- Owns: `e2e/fresh/`.
- Do: a flow that installs clean, launches and reaches the placeholder one
  screen. Every later phase extends this one flow.
- Done when: it passes on Android and iOS in the pipeline.

### 11. Two languages
- Owns: `packages/i18n/`, the CI completeness check.
- Do: string catalogues for English and Vietnamese; the phone's language
  picks one, with a switch in Settings; a CI check that fails when a string
  exists in one language only; every sheet captured in both languages. Fonts
  and layouts checked with Vietnamese diacritics and longer lines.
- Done when: the sample screen appears in a sheet in both languages.
- Status: done — 8e0292b

## Exit

- Native batch one gate passed.
- A third lane can be started from the contracts without asking a question.
