#!/usr/bin/env bash
# Quit the cloned Chrome started by launch_profile_chrome.sh and delete its temp profile.
# Usage: cleanup.sh [port]
set -uo pipefail

PORT="${1:-9333}"
DST="/tmp/browser-automate-chrome-$PORT"

pkill -f -- "--user-data-dir=$DST" || true
sleep 1
rm -rf "$DST"

if pgrep -f -- "--user-data-dir=$DST" >/dev/null; then
  echo "Chrome on $DST is still running" >&2
  exit 1
fi
echo "Closed cloned Chrome and removed $DST"
