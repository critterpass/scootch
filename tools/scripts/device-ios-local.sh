#!/usr/bin/env bash
# An iOS device run on a Mac with Xcode and a simulator, the way device.yml runs one on GitHub:
# the e2e-test build for this checkout's native fingerprint, this checkout's JavaScript swapped in,
# a clean install on an erased simulator, then the flows.
#
#   tools/scripts/device-ios-local.sh [folder or file under e2e/]   (default e2e/fresh)
#
# Unlike a GitHub run it keeps one simulator ("Phu's Class local", erased before every run) and keeps
# the newest downloaded builds under ~/Library/Caches/phusclass/e2e-builds, so a rerun starts in
# seconds. Runs on one Mac queue for that simulator, one at a time; the JavaScript export does not
# wait. Only the newest run outputs are kept: simulators and recordings once filled this disk.
# Uncommitted JavaScript is exported as well: the js-commit label then reads `<commit>-local`.
#
# Needs: Xcode with an iOS runtime, jq, gh (signed in), Java 17 and Maestro (~/.maestro/bin).
# Env: MODE (run|capture|video, default run), DEVICE (default "iPhone 17"), MAESTRO_STATES and
# MAESTRO_VARIANTS (as the workflow inputs), OUT (default
# ~/Library/Caches/phusclass/device-runs/<time>, outside the repository: screenshots never go in it).
set -euo pipefail

flows=${1:-e2e/fresh}
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
here=$repo_root/tools/scripts
cache=$HOME/Library/Caches/phusclass/e2e-builds
builds_kept=3
runs_kept=5
lock=/private/tmp/phusclass-simulator-lock
sim_name="Phu's Class local"
device=${DEVICE:-iPhone 17}
runs=$HOME/Library/Caches/phusclass/device-runs
out=${OUT:-$runs/$(date +%Y%m%d-%H%M%S)}
mkdir -p "$cache" "$out"
out=$(cd "$out" && pwd)
work=$out/work
mkdir -p "$work"

# A shell that did not read the profile (an agent's, a script's) still finds Java 17 and Maestro.
if ! java -version >/dev/null 2>&1 && [ -x /opt/homebrew/opt/openjdk@17/bin/java ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export PATH="$HOME/.maestro/bin:$PATH" MAESTRO_CLI_NO_ANALYTICS=1
command -v "${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}" >/dev/null ||
  { echo "Maestro is not installed: see e2e/README.md, Running on a Mac"; exit 1; }
java -version >/dev/null 2>&1 || { echo "Maestro needs Java 17 on the PATH"; exit 1; }

cd "$repo_root"
commit=$(git rev-parse HEAD)
if [ -n "$(git status --porcelain -- apps packages)" ]; then commit=$commit-local; fi

# The build: the newest e2e-test release for this native fingerprint, downloaded once.
GITHUB_REPOSITORY=$(gh repo view --json nameWithOwner -q .nameWithOwner) \
  GITHUB_TOKEN=$(gh auth token) GITHUB_OUTPUT=$work/build.env \
  pnpm --silent exec tsx tools/scripts/resolve-device-build.ts
build_id=$(sed -n 's/^build_id=//p' "$work/build.env")
build_url=$(sed -n 's/^url=//p' "$work/build.env")
archive=$cache/$build_id.tar.gz
if [ ! -f "$archive" ]; then
  echo "Downloading $build_id"
  curl -fsSL --retry 3 -o "$archive.part" "$build_url" && mv "$archive.part" "$archive"
fi
# Only the newest few builds are kept.
ls -t "$cache"/*.tar.gz | tail -n +$((builds_kept + 1)) | while IFS= read -r old; do rm -f "$old"; done

echo "Exporting the JavaScript ($commit)"
"$here/device-export-bundle.sh" ios "$work/bundle" "$commit" >"$work/export.log" 2>&1 ||
  { tail -20 "$work/export.log"; exit 1; }

# The simulator lock is a folder created with mkdir (atomic), holding the owner's process id.
held=false
release() { if [ "$held" = true ]; then rm -f "$lock/pid" && rmdir "$lock" 2>/dev/null || true; fi; }
trap release EXIT
trap 'exit 130' INT TERM
waited=0
until mkdir "$lock" 2>/dev/null; do
  owner=$(cat "$lock/pid" 2>/dev/null || true)
  if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then
    rm -f "$lock/pid" && rmdir "$lock" 2>/dev/null || true
    continue
  fi
  if [ "$waited" -ge 3600 ]; then echo "The simulator has been busy for an hour" >&2; exit 1; fi
  if [ $((waited % 60)) -eq 0 ]; then echo "Waiting for the simulator (run $owner)" >&2; fi
  sleep 5
  waited=$((waited + 5))
done
echo $$ >"$lock/pid"
held=true

# One simulator for local runs, erased each time: a clean install with no permission granted.
runtime=$(xcrun simctl list runtimes -j |
  jq -r '[.runtimes[] | select(.isAvailable and .platform == "iOS")] | sort_by(.version | split(".") | map(tonumber)) | last | .identifier')
udid=$(xcrun simctl list devices -j |
  jq -r --arg name "$sim_name" --arg rt "$runtime" '.devices[$rt][]? | select(.name == $name) | .udid' | head -1)
if [ -z "$udid" ]; then udid=$(xcrun simctl create "$sim_name" "$device" "$runtime"); fi
xcrun simctl shutdown "$udid" 2>/dev/null || true
xcrun simctl erase "$udid"
open -a Simulator --args -CurrentDeviceUDID "$udid" || true

status=0
RUNNER_TEMP=$work SIM_UDID=$udid JS_COMMIT=$commit MODE=${MODE:-run} \
  "$here/device-ios.sh" "$archive" "$work/bundle" "$out" "$flows" || status=$?
rm -rf "$work/ios-app" "$work/bundle"
if [ -d "$runs" ]; then
  ls -td "$runs"/*/ | tail -n +$((runs_kept + 1)) | while IFS= read -r old; do rm -rf "$old"; done
fi
echo
cat "$out/summary.md"
echo "Output: $out"
exit "$status"
