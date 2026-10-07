#!/usr/bin/env bash
# Evidence about an iOS app that will not come up: what it is signed with, what it embeds, what a
# direct launch prints and what the system logged about it. Every file is small, so a run artifact
# stays readable.
#
#   tools/scripts/device-ios-evidence.sh signing <app> <out dir> <label>
#   tools/scripts/device-ios-evidence.sh launch <udid> <bundle id> <out dir>
#   tools/scripts/device-ios-evidence.sh crashes <udid> <bundle id> <out dir>
set -uo pipefail

step=$1
mkdir -p "$3" 2>/dev/null || true

# Entitlements and signature of the app and every nested bundle, one file per label.
signing() {
  local app=$1 out=$2 label=$3 file
  file=$out/signing-$label.txt
  : >"$file"
  while IFS= read -r bundle; do
    {
      echo "=== ${bundle#"$app"} ($(plutil -extract CFBundleIdentifier raw "$bundle/Info.plist" 2>/dev/null))"
      codesign -dvv "$bundle" 2>&1 | grep -E 'Identifier|Signature|Authority|TeamIdentifier|Format|flags' || true
      echo "--- signature entitlements"
      codesign -d --entitlements - --xml "$bundle" 2>/dev/null | plutil -p - 2>&1 | head -40 || true
      echo "--- binary entitlements section"
      local exe
      exe=$(plutil -extract CFBundleExecutable raw "$bundle/Info.plist" 2>/dev/null || true)
      if [ -n "$exe" ]; then
        # Simulator builds keep their entitlements in the binary, as __TEXT,__entitlements.
        otool -s __TEXT __entitlements "$bundle/$exe" 2>&1 | head -4 || true
      fi
    } >>"$file" 2>&1
  done < <({ echo "$app"; find "$app" -type d \( -name '*.appex' -o -name '*.app' -o -name '*.framework' \) -not -path "$app"; } | sort)
  {
    echo "=== embedded bundles"
    find "$app" -maxdepth 4 \( -name '*.appex' -o -name '*.app' \) -not -path "$app" -print
    echo "=== Info.plist keys"
    plutil -p "$app/Info.plist" | grep -E 'CFBundle(Identifier|Executable|ShortVersion)|MinimumOS|UIRequired|DTPlatform|DTSDK' || true
    echo "=== Hermes bytes of main.jsbundle"
    head -c 16 "$app/main.jsbundle" | xxd | head -2
    file "$app/main.jsbundle"
    echo "=== Expo.plist"
    plutil -p "$app/Expo.plist" 2>&1 | head -30
  } >>"$file" 2>&1
}

# One direct launch with the console attached: prints what the process writes, or why it was refused.
launch() {
  local udid=$1 id=$2 out=$3
  xcrun simctl launch --console-pty "$udid" "$id" >"$out/direct-launch.txt" 2>&1 &
  local pid=$! waited=0
  while kill -0 "$pid" 2>/dev/null && [ "$waited" -lt 25 ]; do sleep 1; waited=$((waited + 1)); done
  if kill -0 "$pid" 2>/dev/null; then
    echo "still running after ${waited}s (the app stayed up)" >>"$out/direct-launch.txt"
    kill "$pid" 2>/dev/null || true
  else
    wait "$pid"
    echo "launch command exited $? after ${waited}s" >>"$out/direct-launch.txt"
  fi
  xcrun simctl spawn "$udid" launchctl list 2>/dev/null | grep -i -E 'scootch|PID' >"$out/direct-launch-processes.txt" || true
  xcrun simctl terminate "$udid" "$id" >/dev/null 2>&1 || true
}

# Crash reports of the app and its extensions, and the system log about the app, kept to a size.
crashes() {
  local udid=$1 id=$2 out=$3
  mkdir -p "$out/crash-reports"
  find "$HOME/Library/Logs/DiagnosticReports" "$HOME/Library/Logs/CoreSimulator" -maxdepth 3 \
    \( -name '*.ips' -o -name '*.crash' \) -mmin -60 2>/dev/null |
    while IFS= read -r report; do
      case "$(basename "$report")" in
        *Scootch* | *scootch* | *Widget* | *Clip* | *Notification* | *Hermes*) head -c 300000 "$report" >"$out/crash-reports/$(basename "$report")" ;;
      esac
    done
  ls -la "$HOME/Library/Logs/DiagnosticReports" >"$out/crash-reports/listing.txt" 2>&1 || true
  xcrun simctl spawn "$udid" log show --last 15m --style compact \
    --predicate "process IN {\"ScootchDev\",\"SpringBoard\",\"runningboardd\",\"installd\",\"containermanagerd\",\"amfid\",\"launchd_sim\",\"dyld\"} AND (eventMessage CONTAINS \"scootch\" OR eventMessage CONTAINS \"Scootch\" OR eventMessage CONTAINS \"$id\" OR process == \"ScootchDev\")" \
    2>&1 | tail -c 400000 >"$out/system-log-app.txt" || true
  xcrun simctl spawn "$udid" log show --last 15m --style compact \
    --predicate 'eventMessage CONTAINS[c] "scootch" AND (eventMessage CONTAINS[c] "crash" OR eventMessage CONTAINS[c] "terminat" OR eventMessage CONTAINS[c] "denied" OR eventMessage CONTAINS[c] "entitlement" OR eventMessage CONTAINS[c] "signature" OR eventMessage CONTAINS[c] "exited" OR eventMessage CONTAINS[c] "fail")' \
    2>&1 | tail -c 200000 >"$out/system-log-refusals.txt" || true
}

case "$step" in
  signing) signing "$2" "$3" "$4" ;;
  launch) launch "$2" "$3" "$4" ;;
  crashes) crashes "$2" "$3" "$4" ;;
  *) echo "unknown step $step"; exit 1 ;;
esac
