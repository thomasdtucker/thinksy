#!/usr/bin/env bash
# auto-sync.sh — Watch context/ for changes, auto-commit and push to GitHub.
#
# Usage:
#   ./context/auto-sync.sh          # foreground (ctrl-c to stop)
#   ./context/auto-sync.sh &        # background
#
# Requires: fswatch (brew install fswatch)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="$REPO_ROOT/context"
LOCK_FILE="$CONTEXT_DIR/.sync.lock"
DEBOUNCE_SECONDS=5

log() {
  echo "[context-sync $(date '+%H:%M:%S')] $*"
}

cleanup() {
  rm -f "$LOCK_FILE"
  log "Stopped."
  exit 0
}
trap cleanup EXIT INT TERM

# Ensure we're in the repo root for all git operations
cd "$REPO_ROOT"

# Verify fswatch is available
if ! command -v fswatch &>/dev/null; then
  echo "Error: fswatch not found. Install with: brew install fswatch" >&2
  exit 1
fi

# Verify this is a git repo with a remote
if ! git remote get-url origin &>/dev/null; then
  echo "Error: No git remote 'origin' configured." >&2
  exit 1
fi

sync_changes() {
  # Prevent overlapping syncs
  if [ -f "$LOCK_FILE" ]; then
    return
  fi
  touch "$LOCK_FILE"

  # Stage only context/ changes
  git add context/

  # Check if there's anything to commit
  if git diff --cached --quiet; then
    rm -f "$LOCK_FILE"
    return
  fi

  # Build a commit message from the changed files
  changed_files=$(git diff --cached --name-only | sed 's|^context/||' | head -10)
  file_count=$(git diff --cached --name-only | wc -l | tr -d ' ')

  if [ "$file_count" -eq 1 ]; then
    msg="context: update $changed_files"
  else
    first_file=$(echo "$changed_files" | head -1)
    msg="context: update $first_file (+$((file_count - 1)) more)"
  fi

  git commit -m "$msg" --no-verify
  log "Committed: $msg"

  # Push (retry once on failure)
  if git push origin HEAD 2>/dev/null; then
    log "Pushed to origin."
  else
    log "Push failed, retrying in 3s..."
    sleep 3
    if git push origin HEAD 2>/dev/null; then
      log "Pushed to origin (retry)."
    else
      log "ERROR: Push failed. Will retry on next change."
    fi
  fi

  rm -f "$LOCK_FILE"
}

log "Watching $CONTEXT_DIR for changes..."
log "Press Ctrl+C to stop."

# fswatch emits changed paths. We batch them with a debounce.
fswatch -r -l "$DEBOUNCE_SECONDS" \
  --exclude '\.git' \
  --exclude '\.sync\.lock' \
  --exclude '\.DS_Store' \
  "$CONTEXT_DIR" | while read -r _; do
    # Drain any additional buffered events
    while read -r -t 1 _; do :; done
    sync_changes
  done
