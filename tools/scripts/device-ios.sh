#!/usr/bin/env bash
# An iOS run on a GitHub macOS runner: download the e2e-test simulator build, swap in this commit's
# JavaScript, install it on a new simulator and run the flows.
#
#   tools/scripts/device-ios.sh <build url> <bundle dir> <out dir> <folder or file under e2e/>
#
# The bundle dir is device-export-bundle.sh output (main.jsbundle plus assets/). The app's
# main.jsbundle and assets are replaced, over-the-air updates are turned off in its Expo.plist (the
# e2e-test variant already builds them off; this keeps a run from ever loading published
# JavaScript) and the app is re-signed ad hoc.
#
# Env: DEVICE (default "iPhone 17"), and JS_COMMIT and MODE, read by device-run-flows.sh.
set -euo pipefail

build_url=$1
bundle_dir=$2
out_dir=$3
flows=$4
here=$(cd "$(dirname "$0")" && pwd)
work=${RUNNER_TEMP:-$(mktemp -d)}/ios-app
mkdir -p "$work/app" "$out_dir"

curl -fsSL --retry 3 -o "$work/app.tar.gz" "$build_url"
tar -xzf "$work/app.tar.gz" -C "$work/app" && rm "$work/app.tar.gz"
# The archive holds the App Clip beside the app: take the app itself, never the first one found.
app=""
while IFS= read -r candidate; do
  id=$(plutil -extract CFBundleIdentifier raw "$candidate/Info.plist" 2>/dev/null || true)
  case "$id" in '' | *.Clip) ;; *) app=$candidate; break ;; esac
done < <(find "$work/app" -maxdepth 3 -name '*.app' -type d | sort)
[ -n "$app" ] || { echo "::error::No .app in the archive at build_url (iOS needs the simulator .tar.gz)"; exit 1; }
[ -f "$bundle_dir/main.jsbundle" ] || { echo "::error::No main.jsbundle in $bundle_dir"; exit 1; }

evidence="$here/device-ios-evidence.sh"
"$evidence" signing "$app" "$out_dir/evidence" as-built || true

cp "$bundle_dir/main.jsbundle" "$app/main.jsbundle"
if [ -d "$bundle_dir/assets" ]; then cp -R "$bundle_dir/assets" "$app/"; fi
if [ -f "$app/Expo.plist" ]; then
  plutil -replace EXUpdatesEnabled -bool NO "$app/Expo.plist"
  plutil -replace EXUpdatesCheckOnLaunch -string NEVER "$app/Expo.plist"
fi
# Simulator entitlements live in the binary, so an ad-hoc signature keeps them.
codesign --force --sign - --timestamp=none "$app"
codesign --verify --deep "$app"
"$evidence" signing "$app" "$out_dir/evidence" after-resign || true

runtime=$(xcrun simctl list runtimes -j |
  jq -r '[.runtimes[] | select(.isAvailable and .platform == "iOS")] | sort_by(.version | split(".") | map(tonumber)) | last | .identifier')
udid=$(xcrun simctl create "Scootch device run" "${DEVICE:-iPhone 17}" "$runtime")
echo "Simulator ${DEVICE:-iPhone 17} on $runtime ($udid)"
xcrun simctl boot "$udid"
xcrun simctl bootstatus "$udid" -b >/dev/null
xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiMode active --wifiBars 3 --dataNetwork wifi
echo "Installing $(basename "$app") ($id)"
xcrun simctl install "$udid" "$app"
# One direct launch first: its console shows a crash or a refusal that Maestro never reports.
"$evidence" launch "$udid" "$id" "$out_dir/evidence" || true

"$here/device-run-flows.sh" ios "$udid" "$out_dir" "$flows"
