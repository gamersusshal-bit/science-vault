#!/usr/bin/env bash
# Build one video end to end: narration -> sound bed -> render -> loudness -> checks.
# Usage: scripts/make.sh <slug>        Output: renders/<slug>.mp4
# A script with "format": "long" is checked as a 16:9 weekly video (PLAYBOOK section 6).
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG="$1"; mkdir -p out renders
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || true)}"
python3 scripts/voice.py "$SLUG" | tail -1
python3 scripts/bed.py "$SLUG"
npx tsc --noEmit
npx remotion render "$SLUG" "out/$SLUG.raw.mp4" --log=error --crf=20 --concurrency=2 ${CHROME:+--browser-executable="$CHROME"}
ffmpeg -v error -y -i "out/$SLUG.raw.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -movflags +faststart "renders/$SLUG.mp4"
python3 scripts/motion.py "renders/$SLUG.mp4" || true
FORMAT=$(python3 -c "import json,sys; print(json.load(open('videos/'+sys.argv[1]+'/script.json')).get('format','short'))" "$SLUG")
python3 scripts/check.py "renders/$SLUG.mp4" "$FORMAT"
