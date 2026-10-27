#!/usr/bin/env bash
# Records an iOS simulator's screen until interrupted (SIGINT or SIGTERM):
#
#   tools/scripts/sim-record.sh <udid> <out base>
#
# One display: <out base>.mp4. iPhone Duo lights one panel at a time and a dark panel records
# nothing, so there it records the lit panel and starts a new part whenever a fold lights the other:
# <out base>--1-outer.mp4, <out base>--2-inner.mp4, and so on, in order, with no gap beyond the
# half second it takes to notice.
set -uo pipefail

udid=$1
base=$2
here=$(cd "$(dirname "$0")" && pwd)
outer=$("$here/sim-display.sh" "$udid" outer)

recorder=""
start() {
  # A background job of a script ignores the interrupt that ends a recording, so the recorder
  # is started through a launcher that listens for it again.
  python3 -c 'import os, signal, sys; signal.signal(signal.SIGINT, signal.SIG_DFL); os.execvp(sys.argv[1], sys.argv[1:])' \
    xcrun simctl io "$udid" recordVideo --codec h264 ${2:+--display="$2"} --force "$1" \
    >/dev/null 2>&1 &
  recorder=$!
}
finish() {
  [ -n "$recorder" ] || return 0
  kill -INT "$recorder" 2>/dev/null
  # A recorder that does not finish within ten seconds is ended, so nothing waits on it.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 "$recorder" 2>/dev/null || break
    sleep 1
  done
  kill -KILL "$recorder" 2>/dev/null
  wait "$recorder" 2>/dev/null
  recorder=""
}
stopping=false
trap 'stopping=true' INT TERM

if [ -z "$outer" ]; then
  start "$base.mp4" ""
  while [ "$stopping" = false ] && kill -0 "$recorder" 2>/dev/null; do sleep 0.5; done
  finish
  exit 0
fi

part=0
lit=""
while [ "$stopping" = false ]; do
  now=$("$here/sim-display.sh" "$udid" auto)
  if [ -n "$now" ] && [ "$now" != "$lit" ]; then
    finish
    part=$((part + 1))
    name=inner
    [ "$now" = "$outer" ] && name=outer
    start "$base--$part-$name.mp4" "$now"
    lit=$now
  fi
  sleep 0.5
done
finish
