#!/usr/bin/env bash
# Posts one comment on a pull request with a device run's pass or fail table and a link to the
# run's artifact. Images are never pushed to a branch: they stay in the artifact.
#
#   tools/scripts/device-pr-comment.sh <pull request number> <out dir>
#
# Env: GH_TOKEN, GITHUB_REPOSITORY, PLATFORM, MODE, JS_COMMIT, JOB_STATUS, RUN_URL, ARTIFACT_URL.
set -euo pipefail

pr=$1
out_dir=$2
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "::error::pr must be a pull request number"; exit 1; }
body=$(mktemp)

{
  echo "### Device run: $PLATFORM, \`js:$JS_COMMIT\`, $JOB_STATUS"
  echo
  if [ -f "$out_dir/summary.md" ]; then
    cat "$out_dir/summary.md"
  else
    echo "The run stopped before any flow ran. See the run's log."
  fi
  echo
  if [ "$MODE" = capture ] || [ "$MODE" = video ]; then
    screens=$(find "$out_dir/screens" -name '*.png' -exec basename {} \; 2>/dev/null | sort)
    if [ -n "$screens" ]; then
      echo "Captured screens (in the artifact, under \`screens/\`):"
      echo
      echo "$screens" | sed 's/^/- `/; s/$/`/'
    else
      echo "No screen was captured."
    fi
    echo
  fi
  if [ -n "${ARTIFACT_URL:-}" ]; then
    echo "[Artifact]($ARTIFACT_URL): JUnit, Maestro output, failure screenshots and captured screens."
  else
    echo "No artifact was uploaded."
  fi
  echo "[Run]($RUN_URL)"
} >"$body"

gh pr comment "$pr" --repo "$GITHUB_REPOSITORY" --body-file "$body"
