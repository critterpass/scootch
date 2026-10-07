# Phase 01: Native batch: camera and on-device reading

Status: tasks 1 to 3 done; the build failed twice on the build tools' doctor step, which is now skipped; not yet proven · Tasks: 4 · Needs: —
Owns: `apps/mobile/modules/scootch-reading/`, `apps/mobile/app.config.ts`
(native fields only), `apps/mobile/package.json`, `pnpm-workspace.yaml`
(catalog), `docs/tech-decisions.md` section 4

Goal: one native build that can open a camera, take a still, and read it on
the phone. Everything after this phase is JavaScript. High effort.

This phase alters the native fingerprint. It lands on one native batch branch
(`feat/native-camera-and-reading`), is built on GitHub's runners, and merges
only when the founder is ready to install the new build. Read
`docs/workflow.md` section 4 and `docs/tech-decisions.md` section 4.

Source to copy, then own: CritterPass
`apps/mobile/modules/cp-ocr/` (`ios/OcrReader.swift`, `ios/OcrSignals.swift`,
`src/order-lines.ts`, `src/quality.ts`, `src/types.ts`, the Swift tests).
Leave behind its barcode reader, document scanner and Android half.

### 1. Camera permission and module
- Owns: `apps/mobile/app.config.ts`, `apps/mobile/package.json`,
  `pnpm-workspace.yaml`.
- Do: add `expo-camera` to the catalog and the app through
  `tools/scripts/lane-install.sh`; add `NSCameraUsageDescription` in English
  and Vietnamese to `PERMISSION_STRINGS` and the plugin entry. No microphone
  use by the camera.
- Done when: the config resolves and the fingerprint changes once.
- Status: done — 4c39d27

### 2. Reading words
- Owns: `apps/mobile/modules/scootch-reading/` (Swift `recognizeText`, the
  JavaScript ordering and quality files).
- Do: `recognizeText(uri, languages)` returns lines in reading order, each
  with a stable id (`l0`, `l1`, …), text, a box normalised to the upright
  image, and confidence; plus the quality verdict (blurry, glare, cut off,
  crumpled) and `no_text`. Accurate recognition, up to 3000 px, English and
  Vietnamese.
- Test: the Swift reader tests and the JavaScript ordering and quality tests,
  carried over with their fixtures.
- Status: done — 4c39d27

### 3. Finding things and zones
- Owns: `apps/mobile/modules/scootch-reading/` (Swift `findThings`).
- Do: `findThings(uri)` returns the separate things in a photo: for each, a
  box, and the best labels Vision's classifier gives its crop with their
  confidence. Foreground instance masks give the boxes; the classifier names
  each crop. Also returns the photo's brightness, so the app can say it is too
  dark. Zones are not native: the rules in phase 02 split the frame from
  these boxes.
- Test: Swift tests on pictures drawn in the test (no real photos are in the
  repository): the box of a mask, nothing found on an empty table, light
  measured, every box inside the frame. Real desks and rooms are checked on a
  phone.
- Status: done — 4c39d27

### 4. Build and record
- Owns: `docs/tech-decisions.md` section 4.
- Do: add the camera and the reading module to the declared native surface,
  dated. Dispatch
  `gh workflow run native-build.yml -f ref=feat/native-camera-and-reading -f profile=e2e-test`
  and report the run id. The signed TestFlight build
  (`-f profile=dev -f submit=true`) is dispatched only when the founder says.
- Done when: the `e2e-test` build finishes and the app on it reports that the
  reading module exists.
- Status: not started

## Risks

- Foreground instance masks need iOS 17. Check the deployment target first;
  if it is lower, fall back to objectness saliency for boxes.
- Vision's classifier names a crop loosely ("cup", "paper", "cable"). The
  rules in phase 02 work from a short list of label families, not exact words.

## Rollback

The branch is not merged until the build is proven; dropping it leaves main
and the installed build untouched.
