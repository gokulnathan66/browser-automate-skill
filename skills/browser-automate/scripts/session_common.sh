#!/usr/bin/env bash
# Shared session paths and helpers for browser-automate (sourced, not executed).
set -euo pipefail

SESSION_ROOT="${TMPDIR:-/tmp}/browser-automate-sessions"
SESSION_MAX_AGE_SEC=900

session_ensure_root() {
  mkdir -p "$SESSION_ROOT"
  chmod 700 "$SESSION_ROOT"
}

validate_profile_folder() {
  local profile="$1"
  if [[ -z "$profile" || "$profile" == */* || "$profile" == *..* ]]; then
    echo "Invalid profile folder (use a single segment like Default or 'Profile 1'): $profile" >&2
    return 1
  fi
}

validate_start_url() {
  local url="$1"
  case "$url" in
    http://*|https://*) return 0 ;;
    *)
      echo "Start URL must be http or https: $url" >&2
      return 1
    ;;
  esac
}

url_host() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse
print(urlparse(sys.argv[1]).hostname or "")
PY
}

find_free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

session_file_path() {
  echo "$SESSION_ROOT/$1.json"
}

safe_chrome_data_dir() {
  local dir="$1"
  session_ensure_root
  local real_root real_dir
  real_root="$(cd "$SESSION_ROOT" && pwd)"
  if [[ ! "$dir" == "$real_root"/chrome.* ]]; then
    echo "Refusing to touch path outside session root: $dir" >&2
    return 1
  fi
  if [[ -L "$dir" ]]; then
    echo "Refusing to use symlink data dir: $dir" >&2
    return 1
  fi
  real_dir="$(cd "$dir" && pwd)"
  if [[ ! "$real_dir" == "$real_root"/chrome.* ]]; then
    echo "Refusing resolved path outside session root: $real_dir" >&2
    return 1
  fi
  printf '%s' "$real_dir"
}

kill_session_pid() {
  local pid="$1"
  if [[ -z "$pid" || "$pid" == "0" ]]; then
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || return 0
      sleep 0.25
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
}

remove_session_data_dir() {
  local dir="$1"
  local safe
  safe="$(safe_chrome_data_dir "$dir")" || return 1
  rm -rf "$safe"
}

cleanup_one_session_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local dir pid
  dir="$(python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
print(d.get("data_dir", ""))
PY
)"
  pid="$(python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
print(d.get("chrome_pid", 0))
PY
)"
  kill_session_pid "$pid"
  [[ -n "$dir" ]] && remove_session_data_dir "$dir" 2>/dev/null || true
  rm -f "$file"
}

cleanup_stale_sessions() {
  session_ensure_root
  local now file started age
  now="$(date +%s)"
  for file in "$SESSION_ROOT"/*.json; do
    [[ -f "$file" ]] || continue
    started="$(python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    print(int(json.load(f).get("started_at", 0)))
PY
)" || continue
    age=$((now - started))
    if [[ "$age" -ge "$SESSION_MAX_AGE_SEC" ]]; then
      cleanup_one_session_file "$file"
      echo "Removed stale session $(basename "$file" .json)"
    fi
  done
}
