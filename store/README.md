# The App Store listing: screenshots and App Review details

Scripts that put Phu's To-Do's screenshots and review details on the prd app in App Store Connect.
They talk to the App Store Connect API through `asc.mjs`, which reads
`~/.config/phusclass/asc.env` (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `ASC_APP_ID_PRD`,
`ASC_APP_ID_DEV`) and prints none of it. Nothing here submits for review: that is the founder's
call.

## What is set

| Thing | Value |
|---|---|
| App | "Phu's To-Do: Strict Teacher" (en), "Phu's To-Do: Việc Cần Làm" (vi), the id in `ASC_APP_ID_PRD`; the dev app is "Phu's To-Do Dev". Renamed from "Phu's Class" on 30 Oct 2026 |
| Version | 1.0, `a80939c7-3fae-43c0-99ac-e6dda78fb289`, prepare for submission |
| Localizations | en-US `523aeac3-ce5a-4b52-93c9-7828a9c1427d`, vi `4945ba9f-0db0-41c1-841a-d23a3198e313` |
| Screenshot sets | `APP_IPHONE_67` (6.9", 1320 × 2868) and `APP_IPHONE_61` (6.3", 1206 × 2622), six frames each |
| en-US sets | 6.9" `db659470-b8b1-4db8-9542-1f8ed2b39cc8`, 6.3" `046ecf02-5060-4a5a-82a6-c2b11768055d` |
| vi sets | 6.9" `13f4e1c4-2c7b-4c34-9d1d-2c7f4e831c02`, 6.3" `83b8a725-de06-41e7-af47-0f4c227499f9` |
| Review details | Set on 1.0 by `review.mjs` (contact Khanh Bui, hello@phusclass.com, no demo account). The phone is passed as `REVIEW_CONTACT_PHONE` and never kept here. |
| Demo account | Not required |

Why these sizes: App Store Connect requires at least one 6.3" (Dynamic Island, medium display)
screenshot, and a 6.9" set makes the 6.5" set optional; smaller sizes scale from these. The app is
iPhone only (`supportsTablet: false`), so there is no iPad set.

iPhone Duo: App Store Connect has an `APP_IPHONE_DUO` display type (outer display 1398 × 2034,
inner 2007 × 2853), required from April 2027 for apps built with the iOS 27.1 SDK or later. Add a
Duo size to `render.ts` and `upload.mjs` once the app's Duo layout lands, and capture it on a Duo
simulator.

## The frames

Six frames, in this order (`screenshots/captions.ts`):

1. `desk-hot`: one task on the desk, Thầy Phú at full pressure
2. `board-full`: the whole board
3. `session-running`: a period under way
4. `share-certificate`: the certificate for starting
5. `report-card`: the report card
6. `tuition-offer`: the tuition receipt with the free week

Each frame is the light-theme capture of that registry state in a phone outline on the classroom
page colour, with a caption in one language above it, drawn from `screenshots/frame.html`. The
captions are marketing copy, but `render.ts` runs every one through Thầy Phú's word check
(`packages/voice/src/class/check.ts`) and refuses to draw if one fails.

| File | What it does |
|---|---|
| `screenshots/captions.ts` | The frames: registry state and caption per language |
| `screenshots/frame.html` | The frame template, sized in vw so one page draws every display size |
| `screenshots/render.ts` | Checks the captions and draws every frame and a contact sheet per size with Playwright |
| `screenshots/upload.mjs` | Replaces each localization's screenshot sets with the drawn frames |
| `review.mjs` | Creates or updates the App Review details (notes, contact, no demo account) |
| `asc.mjs` | The App Store Connect API client |

## Running it again

Everything it writes goes outside the repository. From the repository root:

```sh
out=<scratch folder>
# 1. Capture the states, English and Vietnamese, on the shared simulator.
MODE=capture \
  MAESTRO_STATES=desk-hot,board-full,session-running,share-certificate,report-card,tuition-offer \
  MAESTRO_VARIANTS=en-light-default,vi-light-default \
  OUT=$out/run tools/scripts/device-ios-local.sh e2e/sheets/capture-registry.yaml
# 2. Draw the frames: $out/frames/<size>/<lang>/NN-<state>.jpg and $out/frames/contact-<size>.png.
pnpm exec tsx store/screenshots/render.ts $out/run/screens $out/frames
# 3. Upload them, replacing what each set holds.
node store/screenshots/upload.mjs $out/frames
# 4. The review details. The first run needs the contact phone (never committed).
REVIEW_CONTACT_PHONE='+84 ...' node store/review.mjs
```

To change a frame, edit `captions.ts` (a new state needs its capture in step 1) and run steps 2
and 3. Upload is idempotent: each run empties the set first, then uploads in order.
