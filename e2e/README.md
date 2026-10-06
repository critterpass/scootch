# Device flows

Maestro flows that prove the app on a real Android emulator or iOS simulator. They run on GitHub
Actions only (`.github/workflows/device.yml`), never on a developer's machine.

- `e2e/fresh/` is the fresh-user walk: one new install, walked the way a new person meets the app.
  **Every feature extends this folder** with its next numbered step (`02-…`, `03-…`); a feature
  without a step here has not been proven for a real user.
- `e2e/_run/` belongs to the pipeline. `js-commit.yaml` runs first in every run and is not a place
  for product flows.

## Dispatching a run

```sh
gh workflow run device.yml --ref <branch> \
  -f platform=android \
  -f build_url=<URL of an e2e-test build> \
  -f flows=e2e/fresh \
  -f mode=run \
  -f pr=<pull request number>
```

| Input | Meaning |
| --- | --- |
| `platform` | `android` (default, a Linux runner with an emulator) or `ios` (a macOS runner with a simulator). |
| `build_url` | The `e2e-test` build to install: the `.apk` for Android, the simulator `.tar.gz` for iOS. Required. The workflow never starts a build. |
| `flows` | A folder (every `.yaml` in it, in name order) or one file, under `e2e/`. Default `e2e/fresh`. |
| `mode` | `run` reports pass or fail. `capture` also keeps every `takeScreenshot` image under `screens/` in the artifact. |
| `pr` | Optional. The pull request that gets one comment with the pass or fail table and a link to the artifact. |

Dispatch, note the run id and stop: do not wait for the run inside a working session. Dispatching
the same flows on the same branch again cancels the older run.

## What a run does

1. Exports this commit's JavaScript as Hermes bytecode for the `e2e-test` variant, with the commit
   inlined as `EXPO_PUBLIC_JS_COMMIT` (`tools/scripts/device-export-bundle.sh`).
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
image on Android (images live in the APK's compiled resources), does: wait for the next native
batch and its `e2e-test` build.

**Screenshots are run artifacts only.** They are never committed, never pushed to any branch and
never fetched into the repository: a sister repository filled a disk that way.

## What a flow may and may not do

- Start from a clean install (`launchApp` with `clearState: true`) and get everywhere the way a
  person does: by pressing what is on the screen.
- No seeded shortcuts: no seed buttons, no prepared accounts, no state written behind the app.
- No deep links (`openLink`) to skip steps.
- Meet the real permission prompts; nothing is granted beforehand.
- Find elements by test id; match text only when the text is the thing being proven.
- Assert the outcome of each step (what the screen shows afterwards), not just that it rendered.
- Name every `takeScreenshot` `<folder>-<step>-<state>`, for example `fresh-01-first-launch`.

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
