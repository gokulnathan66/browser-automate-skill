#!/usr/bin/env bash
# End a browser-automate session: kill recorded Chrome PID and delete the temp profile.
#
# Usage:
#   cleanup.sh --session <SESSION_ID>
#   cleanup.sh --stale
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=session_common.sh
source "$SCRIPT_DIR/session_common.sh"

SESSION_ID=""
DO_STALE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)
      SESSION_ID="${2:?}"
      shift 2
      ;;
    --stale)
      DO_STALE=1
      shift
      ;;
    *)
      echo "Unknown argument: $1 (use --session ID or --stale)" >&2
      exit 2
      ;;
  esac
done

session_ensure_root

if [[ "$DO_STALE" -eq 1 ]]; then
  cleanup_stale_sessions
  exit 0
fi

if [[ -z "$SESSION_ID" ]]; then
  echo "Pass --session <SESSION_ID> or --stale" >&2
  exit 2
fi

FILE="$(session_file_path "$SESSION_ID")"
if [[ ! -f "$FILE" ]]; then
  echo "No session file for $SESSION_ID" >&2
  exit 1
fi

cleanup_one_session_file "$FILE"
echo "Closed session $SESSION_ID"
