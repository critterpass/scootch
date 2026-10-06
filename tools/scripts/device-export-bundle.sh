#!/usr/bin/env bash
# Exports this commit's JavaScript as the Hermes bytecode bundle a device run swaps into the
# installed e2e-test app. The commit is inlined as EXPO_PUBLIC_JS_COMMIT, which the app shows in
# its `js-commit` label.
#
#   tools/scripts/device-export-bundle.sh <ios|android> <out dir> <commit>
#
# Writes <out dir>/main.jsbundle (iOS) or <out dir>/index.android.bundle (Android), plus the assets.
set -euo pipefail

platform=$1
out_dir=$2
commit=$3
repo_root=$(cd "$(dirname "$0")/../.." && pwd)

case "$platform" in
  ios) file=main.jsbundle ;;
  android) file=index.android.bundle ;;
  *) echo "::error::platform must be ios or android, not \"$platform\""; exit 1 ;;
esac

mkdir -p "$out_dir"
out_dir=$(cd "$out_dir" && pwd)

cd "$repo_root/apps/mobile"
APP_VARIANT=e2e-test NODE_ENV=production EXPO_PUBLIC_JS_COMMIT=$commit \
  pnpm exec expo export:embed --platform "$platform" --dev false --minify true --bytecode \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output "$out_dir/$file" --assets-dest "$out_dir"

# Bytecode keeps string literals as they are, so the commit can be found in the file.
grep -q "$commit" "$out_dir/$file" ||
  { echo "::error::The $platform bundle does not carry $commit"; exit 1; }
echo "$out_dir/$file"
