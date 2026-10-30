#!/usr/bin/env bash
# Runs Maestro flows on a booted simulator or emulator that already has the patched app.
#
#   tools/scripts/device-run-flows.sh <ios|android> <udid|serial> <out dir> <folder or file under e2e/>
#
# Env: JS_COMMIT (the commit the bundle was exported from), MODE (run|capture|video).
# `video` is `capture` plus a screen recording of each flow (iOS simulator only), for motion.
# SIM_DISPLAY (iOS: auto|outer|inner|<display id>, default auto) picks the display the screenshots
# and recordings read on a simulator with two (iPhone Duo; see sim-display.sh): `auto` is the one
# that is on when each flow starts. On such a device every `takeScreenshot` image is taken again
# from that display as soon as Maestro writes it, because Maestro reads the inner one.
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
scripts=$repo_root/tools/scripts
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
    # The panel lit now: a fold during the flow may have moved the app.
    lit=$("$scripts/sim-display.sh" "$device" auto)
    xcrun simctl io "$device" screenshot ${lit:+--display="$lit"} \
      "$out_dir/failures/$slug.png" >/dev/null 2>&1 || true
    xcrun simctl spawn "$device" log show --last 10m --style compact \
      --predicate 'process BEGINSWITH "PhusToDo" OR subsystem == "com.facebook.react.log"' \
      >"$out_dir/failures/$slug.log.txt" 2>/dev/null || true
    "$(dirname "$0")/device-ios-evidence.sh" crashes "$device" "${APP_ID:-com.phusclass.dev}" "$out_dir/evidence/$slug"
  fi
}

# Takes every `takeScreenshot` image again from the given display as soon as Maestro has written
# it, before the flow moves on: Maestro reads the inner display of iPhone Duo even while it is off.
# Under `auto`, a fold made during the flow moves it to the panel that fold lit (duo-fold.sh notes
# it in the fold state folder).
fold_state=${TMPDIR:-/tmp}/phusclass-duo-fold
retake_screens() {
  local folder=$1 from=$2 seen=" " file size lit
  while :; do
    while IFS= read -r file; do
      case "$seen" in *" $file "*) continue ;; esac
      size=$(stat -f %z "$file" 2>/dev/null || echo 0)
      sleep 0.1
      [ "$size" -gt 0 ] && [ "$size" = "$(stat -f %z "$file" 2>/dev/null || echo 0)" ] || continue
      seen="$seen$file "
      lit=""
      if [ "${SIM_DISPLAY:-auto}" = auto ]; then lit=$(cat "$fold_state/lit-$device" 2>/dev/null); fi
      xcrun simctl io "$device" screenshot --display="${lit:-$from}" "$file" >/dev/null 2>&1 ||
        echo "::warning::Could not take $(basename "$file") again from display ${lit:-$from}"
    done < <(find "$folder" -name '*.png' -not -name 'screenshot-*' 2>/dev/null)
    sleep 0.2
  done
}

# On a device with two displays (iPhone Duo) a flow may fold it: before it starts (`# fold:` in its
# header) or from inside it (e2e/common/fold.js, through duo-fold-server.py at DUO_FOLD_URL).
fold_url=""
fold_server=""
if [ "$platform" = ios ] && [ -n "$("$scripts/sim-display.sh" "$device" outer)" ] &&
  command -v "${AGENT_DEVICE:-agent-device}" >/dev/null; then
  fold_port=${DUO_FOLD_PORT:-7311}
  rm -f "$fold_state/lit-$device"
  python3 -I "$scripts/duo-fold-server.py" "$device" "$fold_port" \
    "$([ "$keeps_screens" = true ] && echo "$out_dir/screens")" &
  fold_server=$!
  fold_url=http://127.0.0.1:$fold_port
fi
stop_folding() {
  if [ -n "$fold_server" ]; then
    kill "$fold_server" 2>/dev/null
    "$scripts/duo-fold.sh" done "$device" >/dev/null 2>&1 || true
  fi
}
trap stop_folding EXIT

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
  # A flow for a pose of iPhone Duo names it in its header (`# fold: book`): the device is put in
  # that pose first (duo-fold.sh). A pose that cannot be set fails the flow; elsewhere it is run as
  # it is.
  pose=$(sed -n '/^---/q; s/^# fold: *\([a-z]*\).*/\1/p' "$flow" | head -1)
  if [ -n "$pose" ] && [ -n "$fold_url" ] && ! "$scripts/duo-fold.sh" "$pose" "$device"; then
    echo "::endgroup::"
    echo "::error title=Pose not set::$flow needs the $pose pose"
    row "| **fail** | \`$flow\` (pose $pose not set) | |"
    failed=$((failed + 1))
    continue
  fi
  # The display this flow's captures read, where the device has two; empty for Maestro's own.
  display=""
  if [ "$platform" = ios ]; then display=$("$scripts/sim-display.sh" "$device" "${SIM_DISPLAY:-auto}"); fi
  retaker=""
  if [ "$keeps_screens" = true ] && [ -n "$display" ]; then
    retake_screens "$dir" "$display" &
    retaker=$!
  fi
  recorder=""
  if [ "$records" = true ]; then
    # On iPhone Duo the recording follows the lit panel, one part per panel (sim-record.sh).
    "$scripts/sim-record.sh" "$device" "$out_dir/video/$slug" &
    recorder=$!
  fi
  started=$(date +%s)
  (cd "$dir" && MAESTRO_DRIVER_STARTUP_TIMEOUT=360000 "$maestro" --device "$device" test \
    "$repo_root/$flow" --format junit --output "$out_dir/junit/$slug.xml" \
    --test-output-dir "$dir" --debug-output "$dir" --flatten-debug-output \
    -e "JS_COMMIT=${JS_COMMIT:-}" ${fold_url:+-e "DUO_FOLD_URL=$fold_url"})
  status=$?
  if [ -n "$retaker" ]; then
    sleep 1
    kill "$retaker" 2>/dev/null
    wait "$retaker" 2>/dev/null
  fi
  seconds=$(($(date +%s) - started))
  # A background job ignores interrupts, so the recorder is asked to stop with TERM; it ends its
  # own recorders within seconds.
  if [ -n "$recorder" ]; then
    kill -TERM "$recorder" 2>/dev/null || true
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
