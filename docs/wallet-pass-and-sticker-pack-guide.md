# Wallet pass and Messages sticker pack: what is left to do

Two parts of the Plus Materials board need things only the Apple developer
account's owner can create. This is the order to do them in. Both change the
native fingerprint, so both belong in one native batch.

## A. "Add card to Wallet"

The member card as a Wallet pass: the number the server gave, the year, and
the finish as its colours. A pass is a signed zip (`.pkpass`); the phone only
hands it to PassKit.

### 1. In the Apple developer account

1. Certificates, Identifiers & Profiles → Identifiers → **+** → **Pass Type
   IDs**. Create `pass.app.scootch.member` (and `pass.app.scootch.dev.member`
   for the dev app).
2. Open the Pass Type ID → **Create Certificate**. Make a signing request in
   Keychain Access (Certificate Assistant → Request a Certificate from a
   Certificate Authority, saved to disk), upload it, download the `.cer`.
3. Double-click the `.cer`, then in Keychain Access export the certificate
   **with its private key** as a `.p12`. Keep it in `certs/` (ignored by git).
4. Download Apple's **WWDR G4** intermediate certificate from
   apple.com/certificateauthority.
5. Turn the three into PEM text:
   ```sh
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass-cert.pem -legacy
   openssl pkcs12 -in pass.p12 -nocerts -nodes -out pass-key.pem -legacy
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```

### 2. Secrets on the API (names only)

Add to `apps/api/.env.example` and set with `wrangler secret put … --env dev`
(and prd):

- `PASS_TYPE_ID`
- `PASS_TEAM_ID`
- `PASS_CERT_PEM`
- `PASS_KEY_PEM`
- `PASS_WWDR_PEM`

### 3. The route

`GET /v1/members/pass`, device access, one file in `apps/api/src/routes/`.

- Read the device's number from `member_numbers`; 404 when it has none.
- Build `pass.json`: `formatVersion: 1`, `passTypeIdentifier`,
  `teamIdentifier`, `organizationName: "Scootch"`, `serialNumber` (the member
  number), `description`, a `generic` or `storeCard` style with the number as
  the primary field and "member since" as a secondary field, and
  `backgroundColor`, `foregroundColor`, `labelColor` from the finish (take the
  material's first stock colour, `text` and `sub` from
  `packages/art/src/card/materials/`).
- Add `icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png` (bake them with the
  art package, as the widget art is baked).
- `manifest.json`: the SHA-1 of every file in the pass.
- `signature`: a detached PKCS #7 signature of `manifest.json`, made with the
  pass certificate, its key and the WWDR certificate, with the signing time
  attribute.
- Zip the files (store or deflate) and answer with
  `Content-Type: application/vnd.apple.pkpass`.

**To prove first:** Workers have no PKCS #7 in Web Crypto. `passkit-generator`
does not run on Workers as it is; `node-forge` can build the signature under
`nodejs_compat`, and `fflate` can zip. Spike it in a test that verifies the
signature with `openssl smime -verify` before building the route on it. If it
will not run on a Worker, sign in a small Node service instead.

The server still does not know whether the phone holds Plus (the same as the
member number). A pass unlocks nothing, so this is accepted; say so in the
route's comment.

### 4. On the phone

1. A local Expo module, `apps/mobile/modules/scootch-wallet/`, shaped like
   `scootch-video-writer`: `canAddPasses()` (`PKAddPassesViewController.canAddPasses()`)
   and `addPass(fileUri)` (read the file into `PKPass`, present
   `PKAddPassesViewController`).
2. No entitlement is needed to add a pass. Do not add the Wallet capability:
   it is for reading passes back.
3. In `features/plus/manage-screen.tsx`, between the three figures and the
   rows, the board's black capsule "Add card to Wallet". Show it only when the
   module is present, `canAddPasses()` is true and the member has a number.
   Strings `plus.card.wallet` and `plus.card.wallet.hint` in both languages.
4. The tap downloads the pass to the cache and hands it to the module. A
   failure says one plain line; nothing is charged, so it never mentions money.
5. Add the row's removal from `docs/undesigned-states.md` and tick phase 07.

Apple's rule: use Apple's own "Add to Apple Wallet" badge artwork or a plain
button with that wording; do not redraw the Wallet icon.

## B. Messages sticker pack

### The decision to make first

The build tooling (`@bacons/apple-targets`, type `imessage`) makes a **sticker
pack with no code**. Its stickers are files baked at build time:

- Everyone gets the same stickers, in tomato, on no finish.
- The round "PLUS · MEMBER 0042" sticker cannot carry a number, and a pack
  cannot check Plus, so it would have to be left out or say only "Scootch".

A pack that wears the person's ink, finish and number is a **Messages app
extension** written by hand (`MSMessagesAppViewController` showing an
`MSStickerBrowserView` of PNG files the app writes into the App Group). The
tooling has no template for it; it needs a custom target.

Recommended: ship the baked pack first (Scootch pleased, Scootch asleep, the
two word stickers), and treat the dressed pack as its own piece of work.

### 1. In the Apple developer account

Capability syncing is off, so App IDs are made by hand, as the App Clip's were.

1. Identifiers → **+** → App IDs → App. Create `app.scootch.stickers` and
   `app.scootch.dev.stickers`. No capabilities for a baked pack. (The dressed
   pack needs **App Groups** with the app's group.)
2. Profiles → **+** → App Store Connect distribution, one for each new App ID,
   with the existing distribution certificate.
3. Give both to EAS: `eas credentials` → iOS → the build profile → the new
   target → upload the profile.

### 2. The target

`apps/mobile/targets/stickers/`:

- `expo-target.config.js`: `type: 'imessage'`, `name: 'ScootchStickers'`,
  `bundleIdentifier: '.stickers'`, `deploymentTarget` from
  `config.ios.deploymentTarget`, and an `icon`.
- `Stickers.xcstickers/` with:
  - `Contents.json`
  - `iMessage App Icon.stickersiconset/` and its `Contents.json`. Messages
    wants its own sizes (among them 1024×768, 60×45, 67×50, 74×55, 27×20 and
    32×24, at their scales). A build without the full set is refused by App
    Store validation.
  - `Sticker Pack.stickerpack/Contents.json` listing the stickers, and one
    `<name>.sticker/` folder each with the PNG and a `Contents.json` holding
    its accessibility label.

### 3. Baking the stickers

Extend `packages/art/scripts/bake-surfaces.ts` (or add a sibling script):
draw each sticker with `dieCut` from `packages/art/src/card/share-kit.ts`, the
same white edge the shared sticker sheet has, at 618×618 on a transparent
ground (Apple's large sticker size; each file under 500 KB). Write a manifest
of hashes beside them, as `ScootchArt.xcassets/bake-manifest.json` does, so
the art package's test fails when a drawing changes and the bake was not run.

### 4. Proving it

A sticker pack has no screen of its own to walk. After the `e2e-test` build,
open Messages in the simulator and check the pack is in the app drawer; then a
`dev` build to TestFlight and a look on a phone.

## After either one

- `gh workflow run native-build.yml -f ref=<branch> -f profile=e2e-test`, then
  the device run; then `-f profile=dev -f submit=true`.
- A new target or module changes the fingerprint: phones on the old build keep
  working and simply do not show the new thing until they install the new one.
