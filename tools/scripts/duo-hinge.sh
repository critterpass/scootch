#!/usr/bin/env bash
# Puts a booted iPhone Duo simulator in a pose, for device runs on a Mac:
#
#   tools/scripts/duo-hinge.sh <closed|book|stand|open> [udid]   (udid default: the booted Duo)
#   tools/scripts/duo-hinge.sh list                              (prints DeviceHub's controls)
#
# No simctl or devicectl command moves the hinge: only DeviceHub's hinge slider and pose presets
# do. So this drives DeviceHub through System Events, which needs Accessibility access for the
# app that runs it (System Settings, Privacy & Security, Accessibility: the terminal, or the agent's
# shell). The orientation is set with devicectl: book and open lie in landscape, the stand turns the
# inner display to portrait, closed is the outer display in portrait.
#
# It presses the pose preset whose name or description matches (DUO_POSE_<POSE>, a regular
# expression, overrides the name looked for), and otherwise sets the hinge slider: closed at its
# minimum, open at its maximum, book and stand at DUO_HALF_OPEN of the way (default 0.6). It then
# waits until the right display is on. `list` prints every control in DeviceHub's window, to find
# the presets' names once access is granted.
#
# device-run-flows.sh calls it before a flow whose first line is `# hinge: <pose>`.
set -euo pipefail

pose=${1:?usage: duo-hinge.sh <closed|book|stand|open|list> [udid]}
udid=${2:-$(xcrun simctl list devices booted -j |
  jq -r '[.devices[][] | select(.deviceTypeIdentifier | endswith("iPhone-Duo"))][0].udid // empty')}
[ -n "$udid" ] || { echo "duo-hinge: no booted iPhone Duo" >&2; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)

# DeviceHub is Xcode's device window (it replaced Simulator.app): the selected Xcode's copy.
hub_app="$(xcode-select -p)/../Applications/DeviceHub.app"
open -g -a "$hub_app" --args -CurrentDeviceUDID "$udid" 2>/dev/null || open -g -a DeviceHub || true

ui() {
  osascript -e 'with timeout of 20 seconds' -e "$1" -e 'end timeout' 2>&1 || {
    echo "duo-hinge: System Events refused. Give Accessibility access to the app running this" \
      "(System Settings > Privacy & Security > Accessibility)." >&2
    return 1
  }
}

if [ "$pose" = list ]; then
  ui 'tell application "System Events" to tell process "DeviceHub"
    set out to ""
    repeat with e in (entire contents of front window)
      try
        set out to out & (role of e) & " | " & (name of e as text) & " | " & (description of e) & linefeed
      end try
    end repeat
    return out
  end tell'
  exit 0
fi

case "$pose" in
  closed) want=${DUO_POSE_CLOSED:-Closed}; fraction=0; orientation=portrait; display=outer ;;
  book) want=${DUO_POSE_BOOK:-Book|Half}; fraction=${DUO_HALF_OPEN:-0.6}; orientation=landscapeLeft; display=inner ;;
  stand) want=${DUO_POSE_STAND:-Stand|Tent|Desk}; fraction=${DUO_HALF_OPEN:-0.6}; orientation=portrait; display=inner ;;
  open) want=${DUO_POSE_OPEN:-Open|Flat}; fraction=1; orientation=landscapeLeft; display=inner ;;
  *) echo "duo-hinge: the pose is closed, book, stand or open, not \"$pose\"" >&2; exit 1 ;;
esac

# A preset first; else the slider.
pressed=$(ui "tell application \"System Events\" to tell process \"DeviceHub\"
  set frontmost to true
  repeat with e in (entire contents of front window)
    try
      if role of e is in {\"AXButton\", \"AXRadioButton\", \"AXMenuItem\", \"AXCheckBox\"} then
        set label to (name of e as text) & \" \" & (description of e)
        if (do shell script \"printf %s \" & quoted form of label & \" | grep -Eiq \" & quoted form of \"$want\" & \" && echo y || echo n\") is \"y\" then
          click e
          return \"preset\"
        end if
      end if
    end try
  end repeat
  repeat with e in (entire contents of front window)
    try
      if role of e is \"AXSlider\" then
        set lo to value of attribute \"AXMinValue\" of e
        set hi to value of attribute \"AXMaxValue\" of e
        set value of e to lo + (hi - lo) * $fraction
        return \"slider\"
      end if
    end try
  end repeat
  return \"none\"
end tell")
[ "$pressed" = preset ] || [ "$pressed" = slider ] ||
  { echo "duo-hinge: no pose preset matching \"$want\" and no hinge slider in DeviceHub ($pressed)" >&2; exit 1; }

xcrun devicectl device orientation set --device "$udid" "$orientation" >/dev/null 2>&1 || true

# Settled when the display this pose shows on is the one that is on.
target=$("$here/sim-display.sh" "$udid" "$display")
for _ in $(seq 1 30); do
  [ "$("$here/sim-display.sh" "$udid" auto)" = "$target" ] && { echo "$pose ($pressed)"; exit 0; }
  sleep 1
done
echo "duo-hinge: the $display display did not come on after setting $pose" >&2
exit 1
