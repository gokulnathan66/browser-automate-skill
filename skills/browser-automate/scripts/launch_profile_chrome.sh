#!/usr/bin/env bash
# Clone a Chrome profile's login state and launch Chrome with loopback CDP.
#
# Usage: launch_profile_chrome.sh <profile-folder> [start-url] [port-for-tests-only]
# Prints SESSION_ID and CDP URL; blocks until Chrome exits.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=session_common.sh disable=SC1091
source "$SCRIPT_DIR/session_common.sh"

PROFILE="${1:?profile folder required (see list_profiles.py)}"
URL="${2:-about:blank}"
TEST_PORT="${3:-}"

CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

validate_profile_folder "$PROFILE"
validate_start_url "$URL"
session_ensure_root
cleanup_stale_sessions

[[ -x "$CHROME_APP" ]] || { echo "Google Chrome not found at $CHROME_APP" >&2; exit 1; }
[[ -d "$HOME/Library/Application Support/Google/Chrome/$PROFILE" ]] || {
  echo "No Chrome profile folder: $PROFILE" >&2
  exit 1
}

DATA_DIR="$(mktemp -d "$SESSION_ROOT/chrome.XXXXXX")"
chmod 700 "$DATA_DIR"

if [[ -n "$TEST_PORT" ]]; then
  PORT="$TEST_PORT"
  if curl -sf --max-time 1 "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
    echo "Port $PORT already in use" >&2
    rm -rf "$DATA_DIR"
    exit 1
  fi
else
  PORT="$(find_free_port)"
fi

EMAIL="$(python3 "$SCRIPT_DIR/copy_chrome_login.py" "$PROFILE" "$DATA_DIR")" || {
  rm -rf "$DATA_DIR"
  exit 1
}
echo "Cloned profile for $EMAIL"

SESSION_ID="$(python3 - <<PY
import secrets
print(secrets.token_hex(8))
PY
)"
SESSION_FILE="$(session_file_path "$SESSION_ID")"
EXPECTED_HOST="$(url_host "$URL")"
STARTED_AT="$(date +%s)"

CDP_READY=0
CHROME_PID=0

session_teardown() {
  [[ "$CHROME_PID" -gt 0 ]] && kill_session_pid "$CHROME_PID"
  rm -f "$SESSION_FILE"
  if [[ -n "${DATA_DIR:-}" ]]; then
    remove_session_data_dir "$DATA_DIR" 2>/dev/null || rm -rf "$DATA_DIR"
  fi
}

trap session_teardown EXIT INT TERM

"$CHROME_APP" \
  --user-data-dir="$DATA_DIR" \
  --profile-directory=Default \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="$PORT" \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --disable-extensions \
  "$URL" &
CHROME_PID=$!

python3 - "$SESSION_FILE" <<PY
import json, os, sys
path, data = sys.argv[1], {
    "session_id": "$SESSION_ID",
    "data_dir": "$DATA_DIR",
    "port": int("$PORT"),
    "chrome_pid": int("$CHROME_PID"),
    "started_at": int("$STARTED_AT"),
    "expected_host": "$EXPECTED_HOST",
    "profile_folder": "$PROFILE",
    "profile_email": "$EMAIL",
}
with open(path, "w") as f:
    json.dump(data, f)
os.chmod(path, 0o600)
PY

for _ in $(seq 1 40); do
  if curl -sf --max-time 1 "http://127.0.0.1:$PORT/json/version" >/dev/null; then
    CDP_READY=1
    echo "SESSION_ID=$SESSION_ID"
    echo "CDP ready on http://127.0.0.1:$PORT"
    break
  fi
  if ! kill -0 "$CHROME_PID" 2>/dev/null; then
    echo "Chrome exited before CDP was ready" >&2
    exit 1
  fi
  sleep 0.5
done

if [[ "$CDP_READY" -ne 1 ]]; then
  echo "CDP did not come up on port $PORT" >&2
  exit 1
fi

wait "$CHROME_PID" || true
trap - EXIT INT TERM
