# Phase 07: Native batch

Branch kind: native batch (`feat/native-plus-materials`, on top of the
JavaScript phases). Nothing here lands on main between batches. It adds one
native module, so the build testers hold cannot run it: it needs its own
`e2e-test` build before any device run, and a `dev` build before a phone.

### 1. Add card to Wallet
- Do: the API signs a pass for the member number; the app hands it to
  PassKit. The button is absent where the module is.
- Needs from the founder: a Pass Type ID (for example `pass.app.scootch.member`)
  and its certificate in the Apple developer account, with the certificate,
  its key and Apple's WWDR certificate added to the API's secrets (names only
  in `.env.example`). A pass is a signed zip: the Worker has to make a PKCS #7
  signature, which needs a library chosen and proven first.
- Status: blocked — no Pass Type ID certificate exists yet

### 2. The trading card as a looping tilt video
- Do: `modules/scootch-video-writer` stitches forty frames the app draws into
  an MP4. Where the module is absent, or writing fails, the card shares as a
  picture.
- Test: `share.test.ts` (the video path with a recorder, and the fall back).
- Status: done — the Swift has not been compiled or run yet; the first
  native build is the proof

### 3. Messages sticker pack
- Do: a sticker target with baked stickers.
- Needs from the founder: the App IDs `app.scootch.stickers` and
  `app.scootch.dev.stickers` and their provisioning profiles, made by hand as
  the App Clip's were (capability syncing is off).
- Known limit: the target type the build tooling offers is a sticker pack
  with no code, so its stickers are baked at build time. They cannot wear the
  person's ink or finish, and the member sticker cannot carry a number. A
  pack that does would be a Messages app extension, written by hand.
- Status: blocked — the App IDs and profiles do not exist, and the limit
  above needs the founder's call

### 4. Ink on the widgets
- Do: the shared snapshot carries the worn ink's accent; the widgets, the
  Live Activity and the control tint with it. The drawings of Scootch on the
  surfaces are baked in tomato and stay tomato.
- Test: `surface-snapshot.test.ts`, with the sample the Swift decodes.
- Status: done — the Swift has not been compiled or run yet; the targets'
  sources are not in the native fingerprint, so this needs a new build too
