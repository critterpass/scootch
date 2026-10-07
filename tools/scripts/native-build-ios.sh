#!/usr/bin/env bash
# Builds the iOS app on this machine (a GitHub macOS runner) with `eas build --local`: no EAS build
# minutes. EAS still supplies the project, the build number and, for a store profile, the
# distribution certificate and the provisioning profiles of every target, through EXPO_TOKEN.
#
#   tools/scripts/native-build-ios.sh <e2e-test|dev> <out dir>
#
# Writes <out dir>/scootch-<profile>-ios.tar.gz (the simulator app) or .ipa (the signed store
# build), and its path as the `artifact` step output.
#
# Env: EXPO_TOKEN, EAS_CLI (the pinned eas-cli package).
set -uo pipefail

profile=$1
out_dir=$2
repo_root=$(cd "$(dirname "$0")/../.." && pwd)

[ -n "${EXPO_TOKEN:-}" ] || { echo "::error::The EXPO_TOKEN secret is missing"; exit 1; }
case "$profile" in
  e2e-test) extension=tar.gz ;;
  dev) extension=ipa ;;
  *) echo "::error::profile must be e2e-test or dev, not \"$profile\""; exit 1 ;;
esac

mkdir -p "$out_dir"
artifact=$(cd "$out_dir" && pwd)/scootch-$profile-ios.$extension

cd "$repo_root/apps/mobile" || exit 1
started=$SECONDS
# EAS cannot sync an App Clip's capabilities: the App IDs are kept by hand.
EXPO_NO_CAPABILITY_SYNC=1 npx --yes "${EAS_CLI:?}" build --local --profile "$profile" \
  --platform ios --non-interactive --output "$artifact"
status=$?
minutes=$(((SECONDS - started + 30) / 60))
if [ "$status" != 0 ] || [ ! -s "$artifact" ]; then
  echo "::error::eas build --local failed (exit $status) after $minutes min"
  exit 1
fi

size=$(du -h "$artifact" | cut -f1)
echo "artifact=$artifact" >>"${GITHUB_OUTPUT:-/dev/null}"
{
  echo "### Native build: \`$profile\` ios at \`$(git rev-parse --short=12 HEAD)\`"
  echo "Built on this runner in $minutes min ($size)."
} >>"${GITHUB_STEP_SUMMARY:-/dev/stdout}"
