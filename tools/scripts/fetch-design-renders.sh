#!/usr/bin/env bash
# Downloads the image of every designed screen into design/renders/ (ignored by git). The images are
# rendered by the design-renders workflow and kept as one zip on the `design-renders` release;
# design/screens.json lists them.
#
#   tools/scripts/fetch-design-renders.sh
set -euo pipefail

repo=critterpass/scootch
tag=design-renders
asset=design-renders.zip

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
target="$repo_root/design/renders"

download="$(mktemp -d)"
trap 'rm -rf "$download"' EXIT

gh release download "$tag" --repo "$repo" --pattern "$asset" --dir "$download"

# Replaced as a whole, so a screen that was renamed or removed leaves no stale image behind.
rm -rf "$target"
mkdir -p "$target"
unzip -q "$download/$asset" -d "$target"

echo "fetch-design-renders: $(find "$target" -name '*.png' | wc -l | tr -d ' ') images in design/renders/"
