# Spike: baked poses for Swift targets and the web

Date: 7 Oct 2026 · Phase 00, spike 4 · Method: read the CritterPass packages; nothing was run.

## Verdict

Proven already in CritterPass. Reuse the same path; no new technique is needed.

## What exists there

- `@cp/critter-art` separates the drawing model (`core`, `kinds`, `forms`) from
  its `backends`. One backend draws with Skia in the app; another,
  `@cp/critter-art/canvas2d`, draws the same critter on any 2D canvas.
- `@cp/critter-bake` is a Node CLI that renders through the canvas backend
  with `@napi-rs/canvas`, encodes with `sharp`, and has writers for an Xcode
  asset catalogue, Android resources, WebP for the web and an atlas for link
  preview images. It keeps a hash cache so unchanged art is not re-rendered.
- The CritterPass widget target already ships.

## What this means for Scootch

- `packages/art` keeps the same split: a pure drawing model, a Skia backend
  for the app and a canvas backend for Node and the browser.
- Poses for widgets and the Live Activity are baked at build time into the
  asset catalogue. A monster, which is generated per task, is baked on the
  phone into the App Group container when the task is set.
- The website's monster maker and the link preview images use the canvas
  backend directly, so app and web draw the same monster from the same seed.

## Not checked

- Image sizes and memory limits for a widget and a Live Activity with Scootch's
  art. Measure in phase 02 task 6.
- Baking a monster on the phone at task time (Skia snapshot to a file in the
  App Group). CritterPass bakes at build time only.
