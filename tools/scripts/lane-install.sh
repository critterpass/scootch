#!/usr/bin/env bash
# Queued `pnpm install`: at most two installs run at once on this machine, whatever the number of
# lanes. A slot is a folder created with mkdir (atomic), holding the owner's process id.
#
#   tools/scripts/lane-install.sh [pnpm install arguments]
set -euo pipefail

lock_root=/private/tmp/scootch-install-locks
slots=2
wait_seconds=5
max_attempts=240 # 20 minutes

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$lock_root"

held=""
release() {
  if [ -n "$held" ]; then rm -f "$held/pid" && rmdir "$held" 2>/dev/null || true; fi
}
trap release EXIT
trap 'exit 130' INT TERM

# Takes a free slot, or one whose owner is no longer running.
acquire() {
  local slot dir owner
  for slot in $(seq 1 "$slots"); do
    dir="$lock_root/slot-$slot"
    if mkdir "$dir" 2>/dev/null; then
      echo $$ >"$dir/pid"
      held="$dir"
      return 0
    fi
    owner="$(cat "$dir/pid" 2>/dev/null || true)"
    if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then
      rm -f "$dir/pid" && rmdir "$dir" 2>/dev/null || true
    fi
  done
  return 1
}

attempt=0
until acquire; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "lane-install: no free install slot after $((max_attempts * wait_seconds))s" >&2
    exit 1
  fi
  if [ $((attempt % 12)) -eq 1 ]; then echo "lane-install: waiting for an install slot" >&2; fi
  sleep "$wait_seconds"
done

echo "lane-install: installing in $repo_root (${held##*/})" >&2
cd "$repo_root"
pnpm install "$@"
