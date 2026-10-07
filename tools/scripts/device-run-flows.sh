#!/usr/bin/env bash
# Runs Maestro flows on a booted simulator or emulator that already has the patched app.
#
#   tools/scripts/device-run-flows.sh <ios|android> <udid|serial> <out dir> <folder or file under e2e/>
#
# Env: JS_COMMIT (the commit the bundle was exported from), MODE (run|capture|video).
# `video` is `capture` plus a screen recording of each flow (iOS simulator only), for motion.
#
# The first flow is always e2e/_run/js-commit.yaml, which proves the app runs this commit's
# JavaScript; when it fails the other flows are not run, because they would prove nothing.
#
# Writes to <out dir>:
#   junit/<flow>.xml     one report per flow
#   maestro/<flow>/      Maestro's own output and logs
#   failures/<flow>.*    the screen and the device log after a failed flow
#   screens/*.png        every `takeScreenshot` image (capture and video modes)
#   video/<flow>.mp4     the screen during the flow (video mode, iOS)
#   summary.md           the pass or fail table, also added to the job summary
set -uo pipefail

platform=$1
device=$2
out_dir=$3
flows=$4
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
maestro=${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}
proof=e2e/_run/js-commit.yaml

cd "$repo_root" || exit 1
case "$flows" in
  *..*) echo "::error::flows must not contain \"..\""; exit 1 ;;
  e2e | e2e/*) ;;
  *) echo "::error::flows must be a folder or file under e2e/, not \"$flows\""; exit 1 ;;
esac
flows=${flows%/}
if [ -d "$flows" ]; then
  list=$(find "$flows" -name '*.yaml' -not -path 'e2e/_run/*' | sort)
elif [ -f "$flows" ]; then
  list=$flows
else
  echo "::error::No such flow folder or file: $flows"; exit 1
fi
[ -n "$list" ] || { echo "::error::No flows in $flows"; exit 1; }

mkdir -p "$out_dir/junit" "$out_dir/maestro" "$out_dir/failures"
out_dir=$(cd "$out_dir" && pwd)
mode=${MODE:-run}
keeps_screens=false
if [ "$mode" = capture ] || [ "$mode" = video ]; then
  keeps_screens=true
  mkdir -p "$out_dir/screens"
fi
records=false
if [ "$mode" = video ] && [ "$platform" = ios ]; then
  records=true
  mkdir -p "$out_dir/video"
fi

row() {
  echo "$1" >>"$out_dir/summary.md"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$1" >>"$GITHUB_STEP_SUMMARY"; fi
}
row "| result | flow | time |"
row "| --- | --- | --- |"

# The device's screen and recent log, for reading a failure without re-running it.
capture_failure() {
  local slug=$1
  if [ "$platform" = android ]; then
    adb -s "$device" exec-out screencap -p >"$out_dir/failures/$slug.png" || true
    adb -s "$device" logcat -d -b all >"$out_dir/failures/$slug.logcat.txt" || true
    adb -s "$device" logcat -d -b crash >"$out_dir/failures/$slug.crash.txt" || true
  else
    xcrun simctl io "$device" screenshot "$out_dir/failures/$slug.png" >/dev/null 2>&1 || true
    xcrun simctl spawn "$device" log show --last 10m --style compact \
      --predicate 'process BEGINSWITH "Scootch" OR subsystem == "com.facebook.react.log"' \
      >"$out_dir/failures/$slug.log.txt" 2>/dev/null || true
    "$(dirname "$0")/device-ios-evidence.sh" crashes "$device" "${APP_ID:-app.scootch.dev}" "$out_dir/evidence/$slug"
  fi
}

failed=0
proven=true
for flow in $proof $list; do
  slug=${flow%.yaml}
  slug=${slug//\//__}
  if [ "$proven" != true ]; then
    row "| not run | \`$flow\` | |"
    continue
  fi
  dir=$out_dir/maestro/$slug
  mkdir -p "$dir"
  [ "$platform" = android ] && adb -s "$device" logcat -c
  echo "::group::$flow"
  recorder=""
  if [ "$records" = true ]; then
    xcrun simctl io "$device" recordVideo --codec h264 --force "$out_dir/video/$slug.mp4" \
      >/dev/null 2>&1 &
    recorder=$!
  fi
  started=$(date +%s)
  (cd "$dir" && MAESTRO_DRIVER_STARTUP_TIMEOUT=360000 "$maestro" --device "$device" test \
    "$repo_root/$flow" --format junit --output "$out_dir/junit/$slug.xml" \
    --test-output-dir "$dir" --debug-output "$dir" --flatten-debug-output \
    -e "JS_COMMIT=${JS_COMMIT:-}")
  status=$?
  seconds=$(($(date +%s) - started))
  # An interrupt lets the recorder finish its file.
  if [ -n "$recorder" ]; then
    kill -INT "$recorder" 2>/dev/null || true
    wait "$recorder" 2>/dev/null || true
  fi
  echo "::endgroup::"
  if [ "$status" -eq 0 ]; then
    echo "PASS $flow (${seconds}s)"
    row "| pass | \`$flow\` | ${seconds}s |"
  else
    echo "FAIL $flow (${seconds}s)"
    echo "::error title=Maestro flow failed ($platform)::$flow"
    row "| **fail** | \`$flow\` | ${seconds}s |"
    failed=$((failed + 1))
    capture_failure "$slug"
    [ "$flow" = "$proof" ] && proven=false
  fi
  # Maestro's own failure images (named `screenshot-❌-…`) stay in its output folder.
  if [ "$keeps_screens" = true ]; then
    find "$dir" -name '*.png' -not -name 'screenshot-*' -exec cp {} "$out_dir/screens/" \;
  fi
done

if [ "$failed" -gt 0 ]; then
  echo "$failed flow(s) failed"
  exit 1
fi
