#!/usr/bin/env bash
# Put today's MP4s on the "renders" branch (replaced each run, so the repo stays small)
# and print their public links. Usage: scripts/publish_renders.sh <slug> [<slug> ...]
set -euo pipefail
cd "$(dirname "$0")/.."
# RENDERS_BRANCH=renders-long for the weekly long video, so the daily Shorts run never overwrites it.
BRANCH="${RENDERS_BRANCH:-renders}"
REMOTE=$(git remote get-url origin); TMP=$(mktemp -d)
for s in "$@"; do cp "renders/$s.mp4" "$TMP/"; done
cd "$TMP" && git init -q -b "$BRANCH" && git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "Renders $(date -u +%F)"
git push -q -f "$REMOTE" "$BRANCH"
for s in "$@"; do echo "https://raw.githubusercontent.com/gamersusshal-bit/science-vault/$BRANCH/$s.mp4"; done
