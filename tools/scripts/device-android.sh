#!/usr/bin/env bash
# An Android run, called inside android-emulator-runner once the emulator has booted: settle the
# device, install the patched APK (device-patch-android-apk.sh) as a clean install, check the app
# starts, then run the flows.
#
#   tools/scripts/device-android.sh <patched.apk> <out dir> <folder or file under e2e/>
#
# Env: JS_COMMIT and MODE, read by device-run-flows.sh.
set -euo pipefail

apk=$1
out_dir=$2
flows=$3
package=app.scootch.dev
here=$(cd "$(dirname "$0")" && pwd)
serial=$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')
mkdir -p "$out_dir/failures"
device() { adb -s "$serial" shell "$@"; }

# sys.boot_completed comes before the package manager and the launcher are ready to take work.
for _ in $(seq 1 60); do
  device pm path android >/dev/null 2>&1 && [ "$(device getprop init.svc.bootanim | tr -d '\r')" != running ] && break
  sleep 2
done

# No lock screen, screen always on, no install verification, no first-use hints, and no
# "isn't responding" dialogs: a slow software-rendered emulator often trips one in the launcher,
# and the dialog covers the app for the rest of the flow.
device settings put global hide_error_dialogs 1
device settings put secure anr_show_background 0
device locksettings set-disabled true || true
device svc power stayon true
device settings put system screen_off_timeout 2147483647
device settings put global verifier_verify_adb_installs 0
device settings put global package_verifier_enable 0
device settings put secure immersive_mode_confirmations confirmed
device input keyevent 82

# A clean install with no permission granted: the flows meet the real prompts, as a new user does.
adb -s "$serial" install --no-incremental -r "$apk"
echo "Device ABIs: $(device getprop ro.product.cpu.abilist | tr -d '\r')"

# Launch once outside Maestro: a native crash on start is reported here in seconds, with its log,
# instead of as a missing element after every flow's timeout.
device am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
adb -s "$serial" logcat -c
device monkey -p "$package" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
started=false
for _ in $(seq 1 30); do
  sleep 2
  if device pidof "$package" >/dev/null 2>&1 && device dumpsys activity activities | grep -q "topResumedActivity.*$package"; then
    started=true
    break
  fi
done
sleep 5
if [ "$started" != true ] || ! device pidof "$package" >/dev/null 2>&1; then
  adb -s "$serial" logcat -d -b all >"$out_dir/failures/launch.logcat.txt" || true
  adb -s "$serial" exec-out screencap -p >"$out_dir/failures/launch.png" || true
  echo "::error title=App did not start::$package is not running after launch"
  adb -s "$serial" logcat -d -b crash | tail -60
  exit 1
fi
echo "App started"
# Back to a clean install for the first flow.
device pm clear "$package" >/dev/null

"$here/device-run-flows.sh" android "$serial" "$out_dir" "$flows"
