#!/usr/bin/env bash
# One-time setup for a fresh workspace: node deps, python deps, voice model.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm ci --no-audit --no-fund
pip install --break-system-packages -q kokoro-onnx soundfile scipy numpy 2>/dev/null || pip install -q kokoro-onnx soundfile scipy numpy
mkdir -p .models
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s .models/kokoro-v1.0.onnx ] || curl -fsSL -o .models/kokoro-v1.0.onnx $BASE/kokoro-v1.0.onnx
[ -s .models/voices-v1.0.bin ]  || curl -fsSL -o .models/voices-v1.0.bin  $BASE/voices-v1.0.bin
echo "setup ok"
