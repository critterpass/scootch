#!/usr/bin/env bash
# Checks a device run's inputs before anything slow starts, and names the commit whose JavaScript
# the run will prove (the `js_commit` step output).
#
# Env: PLATFORM, BUILD_URL, FLOWS, MODE, PR.
set -euo pipefail

fail() { echo "::error::$1"; exit 1; }
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root"

case "$PLATFORM" in
  android) [[ "$BUILD_URL" =~ ^https://.+\.apk$ ]] || fail "build_url must be the https URL of an e2e-test .apk" ;;
  # Empty on iOS means: the newest build made for this commit's native code (resolve-device-build.ts).
  ios) [[ -z "$BUILD_URL" || "$BUILD_URL" =~ ^https://.+\.tar\.gz$ ]] || fail "build_url must be empty or the https URL of an e2e-test simulator .tar.gz" ;;
  *) fail "platform must be android or ios" ;;
esac
[[ "$FLOWS" =~ ^e2e(/|$) && "$FLOWS" != *..* ]] || fail "flows must be a folder or file under e2e/"
[ -e "$FLOWS" ] || fail "No such flow folder or file: $FLOWS"
[[ "$MODE" == run || "$MODE" == capture ]] || fail "mode must be run or capture"
[[ -z "$PR" || "$PR" =~ ^[0-9]+$ ]] || fail "pr must be a pull request number"

echo "js_commit=$(git rev-parse --short=12 HEAD)" >>"$GITHUB_OUTPUT"
