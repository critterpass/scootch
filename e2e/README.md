# Device flows

Maestro flows that prove the app on a real Android emulator or iOS simulator. A pull request's
proof is a run on GitHub Actions (`.github/workflows/device.yml`); while working, iOS flows run on a
Mac's simulator the same way (see Running on a Mac).

- `e2e/fresh/` is the fresh-user walk: one new install, walked the way a new person meets the app.
  **Every feature extends this folder** with its next numbered step (`02-…`, `03-…`); a feature
  without a step here has not been proven for a real user.
- `e2e/sheets/` captures registry states for the design-beside-device sheets. It opens the
  registry by its link, the one place a flow may use `openLink`.
- `e2e/_run/` belongs to the pipeline. `js-commit.yaml` runs first in every run and is not a place
  for product flows.

## Dispatching a run

```sh
# iOS: installs the newest e2e-test build made for this branch's native code (see Builds)
gh workflow run device.yml --ref <branch> \
  -f platform=ios \
  -f flows=e2e/fresh \
  -f mode=run \
  -f pr=<pull request number>

# Android: the build is always named
gh workflow run device.yml --ref <branch> \
  -f platform=android \
  -f build_url=<URL of an e2e-test .apk> \
  -f flows=e2e/fresh
```

| Input | Meaning |
| --- | --- |
| `platform` | `android` (default, a Linux runner with an emulator) or `ios` (a macOS runner with a simulator). |
| `build_url` | The `e2e-test` build to install. iOS: leave it empty to take the newest build whose native fingerprint is this commit's, or give a simulator `.tar.gz` to install that one instead. Android: the `.apk`, required. The workflow never starts a build. |
| `flows` | A folder (every `.yaml` in it, in name order) or one file, under `e2e/`. Default `e2e/fresh`. |
| `mode` | `run` reports pass or fail. `capture` also keeps every `takeScreenshot` image under `screens/` in the artifact. `video` is `capture` plus a screen recording of each flow under `video/` (iOS), for looking at motion. |
| `states` | Optional, for `flows=e2e/sheets`. A comma-separated list of state id prefixes (`odd-,session-opening`): only the registry rows whose name starts with one of them are captured. Empty captures every state, which grows too long for one job as the registry fills, so a change captures the states it touched. The workflow passes it to Maestro as `MAESTRO_STATES`, and the flow types it into the registry's `registry-states` field. |
| `variants` | Optional, for `flows=e2e/sheets`. A comma-separated list of variant names (`en-light-default,vi-light-default`): only those variants are captured, of the states chosen. Empty captures all eight. Passed as `MAESTRO_VARIANTS` and typed into the registry's `registry-variants` field. The flow fails at once if the first row does not match the lists, rather than capturing everything. |
| `pr` | Optional. The pull request that gets one comment with the pass or fail table and a link to the artifact. |

Dispatch, note the run id and stop: do not wait for the run inside a working session. Dispatching
the same flows on the same branch again cancels the older run.

## Running on a Mac

For quick iteration on a Mac with Xcode and an iOS simulator runtime. It does what an iOS run on
GitHub does (the `e2e-test` build for this checkout's native fingerprint, this checkout's JavaScript
swapped in, a clean install) and writes the same output.

```sh
tools/scripts/device-ios-local.sh e2e/fresh                       # a folder
tools/scripts/device-ios-local.sh e2e/fresh/01-sit.yaml
MODE=video tools/scripts/device-ios-local.sh e2e/fresh             # capture or video, as above
```

- Uncommitted changes under `apps/` and `packages/` are included; the `js-commit` label then reads
  `<commit>-local`.
- One simulator, `Phu's Class local`, is erased before every run. Runs queue for it, one at a time.
- The newest three builds are kept in `~/Library/Caches/phusclass/e2e-builds`, and the newest five
  run outputs in `~/Library/Caches/phusclass/device-runs` (or `OUT=<dir>`), never in the repository.
- A flow in `e2e/fresh/` carries on from the one before it: run the folder, not a later file alone.
- Needs, once: `brew install openjdk@17`, then Maestro at the version in `device.yml`
  (`MAESTRO_VERSION=<version> curl -fsSL https://get.maestro.mobile.dev | bash`), with
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17` and `$JAVA_HOME/bin` and `~/.maestro/bin` on the `PATH`;
  and `gh` signed in, to find the build.
- A native change still needs its `e2e-test` build from `native-build.yml` first; with no build for
  the fingerprint the script stops and says so.

## Builds

Native builds run on GitHub's macOS runners (`.github/workflows/native-build.yml`, which runs
`eas build --local` on macOS 26 with Xcode 26.6): no EAS build minutes. An EAS cloud build is the
fallback when a runner cannot make the build, and still needs the founder's approval. A
JavaScript-only change never needs a build of either kind.

```sh
# The simulator app that device runs install
gh workflow run native-build.yml -f ref=<branch> -f profile=e2e-test

# The signed dev app, sent to TestFlight
gh workflow run native-build.yml -f ref=<branch> -f profile=dev -f submit=true

# The signed App Store app, sent to its own app in App Store Connect
gh workflow run native-build.yml -f ref=main -f profile=prd -f submit=true
```

One build per ref and profile runs at a time; a second dispatch waits. Before building, the job
checks that the Expo prebuilt frameworks link with each other (`check-expo-prebuilds.ts`).

- **`e2e-test`** is published as a GitHub release named
  `native-e2e-test-ios-<fingerprint, 12 characters>-<run id>`, with the simulator `.tar.gz`
  attached and a manifest (profile, native fingerprint, commit, file name) as the release body. An
  iOS device run with no `build_url` computes its commit's native fingerprint
  (`expo-updates fingerprint:generate` as the `e2e-test` variant, no account needed) and installs
  the newest release whose manifest carries exactly that fingerprint
  (`tools/scripts/resolve-device-build.ts`). With no such release the run stops at once and says
  so; it never starts a build.
- **`dev`** is signed with the distribution certificate and provisioning profiles kept on EAS, and
  goes from the runner straight to TestFlight (`eas submit`). This repository is public, so the
  signed `.ipa` is never a run artifact or a release asset, and a `dev` build with `submit=false`
  stops before building. Capability syncing is off (`EXPO_NO_CAPABILITY_SYNC=1`): the App IDs are
  kept by hand.
- **`prd`** is the App Store app (`com.phusclass`), made and sent the same way as `dev`, to the
  store app's record in App Store Connect. It talks to the production API and takes updates from
  the `prd` channel. Its bundle is refused while a helpline is unverified
  (`check-helplines-verified.ts`), so the job runs that check before it compiles.

The fingerprint covers native packages, config plugins and the native fields of `app.config.ts`.
It does not cover the Swift sources under `apps/mobile/targets/`: after changing those, make a new
`e2e-test` build before the device run (the newest build for a fingerprint is the one installed).

The job stops in its first step, naming what is missing, unless the repository has:

| Name | Kind | Needed by | What it is |
| --- | --- | --- | --- |
| `EXPO_TOKEN` | secret | every build | An Expo access token for the account that owns the project; `eas build` does nothing without a login, even for the simulator. |
| `EXPO_ASC_API_KEY_P8` | secret | `dev`, `prd` | The contents of an App Store Connect API key file (`AuthKey_<id>.p8`). |
| `EXPO_ASC_KEY_ID` | secret | `dev`, `prd` | That key's id. |
| `EXPO_ASC_ISSUER_ID` | secret | `dev`, `prd` | The issuer id shown above the keys in App Store Connect. |
| `ASC_APP_ID` | variable | `dev` | The dev app's numeric Apple ID in App Store Connect (App Information). |
| `ASC_APP_ID_PRD` | variable | `prd` | The store app's numeric Apple ID in App Store Connect. |

Device runs need none of them.

## What a run does

1. On iOS, finds the `e2e-test` build (see Builds). Exports this commit's JavaScript as Hermes
   bytecode for the `e2e-test` variant, with the commit inlined as `EXPO_PUBLIC_JS_COMMIT`
   (`tools/scripts/device-export-bundle.sh`).
2. Downloads the `e2e-test` build and swaps that bundle in. Android: replaces
   `assets/index.android.bundle`, zipaligns and signs with a throwaway key
   (`device-patch-android-apk.sh`). iOS: replaces `main.jsbundle` and its assets and re-signs ad hoc
   (`device-ios.sh`). Over-the-air updates are off in the `e2e-test` variant; the Android script
   stops if the build says otherwise and the iOS script sets them off again.
3. Installs it as a clean install, with no permission granted, on a new emulator (API 35, x86_64,
   Pixel 7 profile) or simulator (iPhone 17, the newest installed iOS).
4. Runs `e2e/_run/js-commit.yaml`, which reads the `js-commit` label the app shows
   (`js:<commit>`) and fails unless it is this commit. If it fails, no other flow runs.
5. Runs the flows (`device-run-flows.sh`), then uploads **one** artifact,
   `device-<platform>-<run id>`: `junit/`, `maestro/` (Maestro's output and logs), `failures/` (the
   screen and device log after each failed flow), `screens/` (capture mode) and `summary.md`.

So a JavaScript change never needs a new native build. A change to native code, or a new bundled
image on Android (images live in the APK's compiled resources), does: it lands in a native batch
branch, which gets its own `e2e-test` build from `native-build.yml`.

**Screenshots are run artifacts only.** They are never committed, never pushed to any branch and
never fetched into the repository: a sister repository filled a disk that way.

## What a flow may and may not do

- Start from a clean install (`launchApp` with `clearState: true`) and get everywhere the way a
  person does: by pressing what is on the screen.
- No seeded shortcuts: no seed buttons, no prepared accounts, no state written behind the app.
- No deep links (`openLink`) to skip steps. Only the sheets capture opens the registry by its link.
- Meet the real permission prompts; nothing is granted beforehand.
- Find elements by test id; match text only when the text is the thing being proven.
- Assert the outcome of each step (what the screen shows afterwards), not just that it rendered.
- Name a `takeScreenshot` after the registered screen state it shows, as `<state id>--<variant>`
  (`desk-sit--en-light-default`): a capture with that name is put beside the state's design in
  the run's `sheets/`, and one whose state is not registered is listed in `sheets/summary.md` as
  matching nothing. Other captures may be named `<folder>-<step>-<state>`.

## Writing flows that pass on iOS

These patterns broke flows on CritterPass, where almost every iOS-only failure was one of them:

- A plain `View`'s id inside an `accessible` parent (a card, a list row) is not in iOS's
  hierarchy: find it by the parent's label, or put the id on the accessible view.
- iOS reads a grouped element as one label (a name, a time and a message together; a value with
  its hint): match text with `'.*…'` on both sides.
- A sheet's root id is not in iOS's hierarchy: put an id on the panel inside it and wait on that.
- An element behind a footer, a keyboard or below the fold still counts as visible: hide the
  keyboard and `scrollUntilVisible` before tapping, and never trust an unscrolled tap on a long
  list.
- A page that can come up over the screen at any later step (a welcome, a celebration) will come
  up at the worst one: wait for the screen or the page, and pass the page.

## Android or iOS

Android is the default: Linux runners are plentiful and a run starts at once. GitHub shares a
handful of macOS runners across everything, CI included.

Use `platform=ios` only for what Android cannot show: the keyboard, sheets and modal presentation,
safe areas, the Dynamic Island, widgets, Live Activities and purchases.
