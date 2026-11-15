#!/usr/bin/env bash
# Contact sheet of a rendered video for visual review: out/<slug>.sheet.png (12 frames).
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG="$1"; N=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "renders/$SLUG.mp4")
ffmpeg -v error -y -i "renders/$SLUG.mp4" -vf "select='not(mod(n\,$((N/12))))',scale=270:480,tile=6x2" -frames:v 1 "out/$SLUG.sheet.png"
echo "out/$SLUG.sheet.png"
