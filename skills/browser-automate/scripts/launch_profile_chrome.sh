#!/usr/bin/env bash
# Clone a Chrome profile's login state into a temp data dir and launch Chrome on it with a CDP port.
# Blocks while Chrome runs, so start it in the background.
#
# Usage: launch_profile_chrome.sh <profile-folder> [start-url] [port]
#   launch_profile_chrome.sh "Default" "https://wellfound.com/profile/edit" 9333
set -euo pipefail

PROFILE="${1:?profile folder required, e.g. Default or 'Profile 1' (see list_profiles.py)}"
URL="${2:-about:blank}"
PORT="${3:-9333}"

CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="$HOME/Library/Application Support/Google/Chrome"
DST="/tmp/browser-automate-chrome-$PORT"

[[ -x "$CHROME_APP" ]] || { echo "Google Chrome not found at $CHROME_APP" >&2; exit 1; }
[[ -d "$SRC/$PROFILE" ]] || { echo "No Chrome profile folder: $SRC/$PROFILE" >&2; exit 1; }

if curl -sf --max-time 1 "http://127.0.0.1:$PORT/json/version" >/dev/null; then
  echo "Port $PORT already has a DevTools endpoint; reuse it or run cleanup.sh $PORT" >&2
  exit 1
fi

rm -rf "$DST"
mkdir -p "$DST/Default"
cp "$SRC/Local State" "$DST/Local State"
cp "$SRC/$PROFILE/Preferences" "$DST/Default/Preferences"
cp "$SRC/$PROFILE/Secure Preferences" "$DST/Default/Secure Preferences" 2>/dev/null || true
if [[ -f "$SRC/$PROFILE/Cookies" ]]; then
  cp "$SRC/$PROFILE/Cookies" "$DST/Default/Cookies"
else
  mkdir -p "$DST/Default/Network"
  cp "$SRC/$PROFILE/Network/Cookies" "$DST/Default/Network/Cookies"
fi

python3 - "$DST/Default/Preferences" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    prefs = json.load(f)
prefs.pop("extensions", None)
with open(path, "w") as f:
    json.dump(prefs, f)
email = (prefs.get("account_info") or [{}])[0].get("email", "?")
print(f"Cloned profile for {email}")
PY

(
  for _ in $(seq 1 40); do
    if curl -sf --max-time 1 "http://127.0.0.1:$PORT/json/version" >/dev/null; then
      echo "CDP ready on http://127.0.0.1:$PORT"
      exit 0
    fi
    sleep 0.5
  done
  echo "CDP did not come up on port $PORT" >&2
) &

exec "$CHROME_APP" \
  --user-data-dir="$DST" \
  --profile-directory=Default \
  --remote-debugging-port="$PORT" \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --disable-extensions \
  "$URL"
