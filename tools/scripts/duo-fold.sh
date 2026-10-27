#!/usr/bin/env bash
# Puts a booted iPhone Duo simulator in a pose, or moves its hinge through timed keyframes:
#
#   tools/scripts/duo-fold.sh <closed|book|stand|open> [udid]
#   tools/scripts/duo-fold.sh keyframes '<json>' [udid]      e.g. '[{"atMs":0,"angle":0},{"atMs":4000,"angle":180}]'
#   tools/scripts/duo-fold.sh done [udid]                     ends the fold session (stops the app)
#
# The udid defaults to the booted iPhone Duo. The hinge is moved by `agent-device fold`
# (/opt/homebrew/bin/agent-device), which sends the simulator a hinge event through `simctl spawn`:
# no DeviceHub and no Accessibility access. It needs Xcode 27.1 and a simulator in the default set.
# agent-device folds within a session of its own on the app, opened once per simulator (opening it
# brings the running app to the front and keeps its state) and kept until `done`.
#
# agent-device confirms a pose by reading the hinge angle back with `devicectl device motion`, which
# this Mac's devicectl does not have; the request still goes through. So the pose is confirmed here
# by the panel that is lit (sim-display.sh): the outer one closed, the inner one otherwise. Half open
# and flat both light the inner panel; the app tells them apart by `UIHinge.status`.
#
# The stand is half open with the device on its side, which turns the inner display upright (the
# app allows landscape on that display only; modules/phusclass-fold, FoldOrientation.swift). Every
# other pose is turned back upright, with agent-device in the same session. The iOS 27.1 simulator
# does not yet turn the inner panel for either command (Safari stays at rot90 too).
#
# device-run-flows.sh calls it before a flow whose header says `# fold: <pose>`, and from a flow
# through duo-fold-server.py (`runScript: ../common/fold.js` with `env: { POSE: book }`).
set -uo pipefail

pose=${1:?usage: duo-fold.sh <closed|book|stand|open|keyframes <json>|done> [udid]}
keyframes=""
if [ "$pose" = keyframes ]; then
  keyframes=${2:?duo-fold.sh keyframes needs the keyframes JSON}
  shift
fi
udid=${2:-$(xcrun simctl list devices booted -j |
  jq -r '[.devices[][] | select(.deviceTypeIdentifier | endswith("iPhone-Duo"))][0].udid // empty')}
[ -n "$udid" ] || { echo "duo-fold: no booted iPhone Duo" >&2; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)
agent=${AGENT_DEVICE:-agent-device}
app=${APP_ID:-com.phusclass.dev}
session=phusclass-duo-${udid:0:8}
command -v "$agent" >/dev/null || { echo "duo-fold: agent-device is not installed" >&2; exit 1; }
# agent-device keeps its sessions per working folder: one place, whoever calls.
state=${TMPDIR:-/tmp}/phusclass-duo-fold
mkdir -p "$state"
cd "$state" || exit 1

if [ "$pose" = done ]; then
  "$agent" close --session "$session" >/dev/null 2>&1 || true
  exit 0
fi

case "$pose" in
  closed) agent_pose=closed; turn=portrait; lit=outer ;;
  book) agent_pose=half-open; turn=portrait; lit=inner ;;
  stand) agent_pose=half-open; turn=landscape-left; lit=inner ;;
  open) agent_pose=open; turn=portrait; lit=inner ;;
  keyframes) agent_pose=""; turn=""; lit="" ;;
  *) echo "duo-fold: the pose is closed, book, stand, open or keyframes, not \"$pose\"" >&2; exit 1 ;;
esac

if ! "$agent" session list --json 2>/dev/null | grep -q "\"$session\""; then
  "$agent" open "$app" --udid "$udid" --platform ios --session "$session" --no-record \
    >"$state/open.log" 2>&1 || { cat "$state/open.log" >&2; exit 1; }
fi

if [ -n "$keyframes" ]; then
  "$agent" fold --keyframes "$keyframes" --session "$session" --json >"$state/fold.json" 2>&1
else
  "$agent" fold "$agent_pose" --session "$session" --json >"$state/fold.json" 2>&1
fi
# Sent and confirmed, or sent with no angle to read back: both go on to the panel check.
if ! grep -q '"success": true' "$state/fold.json" &&
  ! grep -q 'fold-pose-dispatched-unverified' "$state/fold.json"; then
  cat "$state/fold.json" >&2
  exit 1
fi

if [ -n "$turn" ]; then
  "$agent" orientation "$turn" --session "$session" >"$state/turn.log" 2>&1 || cat "$state/turn.log" >&2
fi

# The panel now lit, noted for device-run-flows.sh, whose captures follow it.
note_lit() { "$here/sim-display.sh" "$udid" auto >"$state/lit-$udid"; }
if [ -z "$lit" ]; then
  note_lit
  sleep "${DUO_FOLD_SETTLE:-1.5}"
  echo "keyframes done: display $(cat "$state/lit-$udid") is on"
  exit 0
fi
target=$("$here/sim-display.sh" "$udid" "$lit")
for _ in $(seq 1 30); do
  if [ "$("$here/sim-display.sh" "$udid" auto)" = "$target" ]; then
    note_lit
    # The app glides to its new places in under a second: answer once it has settled.
    sleep "${DUO_FOLD_SETTLE:-1.5}"
    echo "$pose: the $lit display is on"
    exit 0
  fi
  sleep 1
done
echo "duo-fold: the $lit display did not come on for $pose" >&2
exit 1
