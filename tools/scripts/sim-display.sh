#!/usr/bin/env bash
# Which display of a booted iOS simulator a capture should read, as `simctl io --display` takes it.
#
#   tools/scripts/sim-display.sh <udid> [auto|outer|inner|<display id>]
#
# Prints nothing for a device with one built-in display: Maestro's own screenshot is right there.
# iPhone Duo has two, and Maestro reads the inner one even while the device is closed and the
# outer one is on. `auto` (the default) prints the one that is on now; `outer` the primary display
# (the cover screen), `inner` the other; a number is printed as it is.
set -uo pipefail

udid=$1
which=${2:-auto}
case "$which" in
  '' | auto | outer | inner) ;;
  *[!0-9]*) echo "sim-display: \"$which\" is not auto, outer, inner or a display id" >&2; exit 1 ;;
  *) echo "$which"; exit 0 ;;
esac

json=$(xcrun devicectl device info displays --device "$udid" --json-output - 2>/dev/null) || exit 0
WHICH=$which python3 -I -c '
import json, os, sys
try:
    displays = json.loads(sys.stdin.read())["result"]["displays"]
except (ValueError, KeyError, TypeError):
    sys.exit(0)
built_in = [d for d in displays if "integrated" in (d.get("type") or {})]
if len(built_in) < 2:
    sys.exit(0)
which = os.environ["WHICH"]
if which == "outer":
    chosen = [d for d in built_in if d.get("primary")]
elif which == "inner":
    chosen = [d for d in built_in if not d.get("primary")]
else:
    chosen = [d for d in built_in if d.get("active")]
if chosen:
    print(chosen[0]["displayId"])
' <<<"$json"
