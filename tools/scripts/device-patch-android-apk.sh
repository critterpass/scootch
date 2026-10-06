#!/usr/bin/env bash
# Turns an e2e-test APK into one that runs this commit's JavaScript.
#
#   tools/scripts/device-patch-android-apk.sh <in.apk> <index.android.bundle> <out.apk>
#
# Replaces assets/index.android.bundle, then zipaligns and signs the APK with a throwaway debug
# key. Needs ANDROID_HOME (its newest build-tools) and Java. Image assets that
# the APK's resources lack cannot be added this way: Android resolves bundled images from compiled
# resources, so a new image needs a new e2e-test build.
#
# The e2e-test variant is built with over-the-air updates off (apps/mobile/app.config.ts). This
# script stops if the APK's manifest says otherwise, so a run never loads published JavaScript.
set -euo pipefail

abs() { (cd "$(dirname "$1")" && echo "$PWD/$(basename "$1")"); }
in_apk=$(abs "$1")
bundle=$(abs "$2")
out_apk=$(abs "$3")
sdk_tools=$(printf '%s\n' "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

updates=$("$sdk_tools/aapt2" dump xmltree --file AndroidManifest.xml "$in_apk" |
  grep -A 1 'expo.modules.updates.ENABLED' | tail -1 || true)
echo "Updates setting in the manifest: ${updates:-none}"
if echo "$updates" | grep -qiE '=("?true|0xffffffff)'; then
  echo "::error::This APK has over-the-air updates on: it is not an e2e-test build"
  exit 1
fi

cp "$in_apk" "$work/app.apk"
mkdir -p "$work/assets"
cp "$bundle" "$work/assets/index.android.bundle"
# Old signatures and the replaced bundle go; the new one is stored uncompressed like the original.
zip -q -d "$work/app.apk" 'META-INF/*' assets/index.android.bundle
(cd "$work" && zip -q -0 app.apk assets/index.android.bundle)

"$sdk_tools/zipalign" -p -f 4 "$work/app.apk" "$work/aligned.apk"
keytool -genkeypair -keystore "$work/debug.keystore" -storepass android -keypass android \
  -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 3650 \
  -dname 'CN=Android Debug,O=Android,C=US' >/dev/null 2>&1
"$sdk_tools/apksigner" sign --ks "$work/debug.keystore" --ks-pass pass:android \
  --key-pass pass:android --out "$out_apk" "$work/aligned.apk"
"$sdk_tools/apksigner" verify "$out_apk"
echo "$out_apk"
