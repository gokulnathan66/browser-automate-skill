#!/usr/bin/env bash
# Symlink the skill into Claude Code and Cursor skill folders.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL="$REPO/skills/browser-automate"

chmod +x "$SKILL"/scripts/*.sh "$SKILL"/scripts/*.py "$SKILL"/scripts/wellfound_add_skills.js "$SKILL"/scripts/read_session.js

for dest in "$HOME/.claude/skills" "$HOME/.cursor/skills"; do
  mkdir -p "$dest"
  target="$dest/browser-automate"
  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Skipping $target: exists and is not a symlink" >&2
    continue
  fi
  ln -sfn "$SKILL" "$target"
  echo "Linked $target -> $SKILL"
done
