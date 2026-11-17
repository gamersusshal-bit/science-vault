#!/usr/bin/env bash
# Thumbnail for a Short: thumbs/<slug>.jpg (1080x1920 JPEG, under 2 MB).
# Reads the "thumb" block of videos/<slug>/script.json: { "at": seconds, "text": [line, line], "accent": "#hex" }.
# Usage: scripts/thumb.sh <slug> [<slug> ...]
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || true)}"
mkdir -p thumbs
for SLUG in "$@"; do
  FRAME=$(python3 -c "import json,sys; print(round(json.load(open('videos/'+sys.argv[1]+'/script.json'))['thumb']['at']*30))" "$SLUG")
  npx remotion still "$SLUG-thumb" "thumbs/$SLUG.jpg" --frame="$FRAME" --image-format=jpeg --jpeg-quality=88 --log=error ${CHROME:+--browser-executable="$CHROME"}
  SIZE=$(stat -c %s "thumbs/$SLUG.jpg"); [ "$SIZE" -lt 2000000 ] || { echo "thumbs/$SLUG.jpg is over 2 MB"; exit 1; }
  echo "thumbs/$SLUG.jpg"
done
