#!/usr/bin/env bash
# Installs what the video tool needs, if it's missing. Safe to run every time.
#   bash video/setup.sh            → prints the environment lines to use (FFMPEG, PLAYWRIGHT_PATH)
set -e
cd "$(dirname "$0")/.."

py_has() { python3 -c "import $1" 2>/dev/null; }
py_has numpy        || pip install -q numpy >&2
py_has kokoro_onnx  || pip install -q kokoro-onnx >&2

# ffmpeg: the system one if present, else a static build from pip
if command -v ffmpeg >/dev/null 2>&1; then FF=$(command -v ffmpeg)
else
  py_has imageio_ffmpeg || pip install -q imageio-ffmpeg >&2
  FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
fi

# Playwright + Chromium: a global install if present, else a local one
PW=""
for p in "$(npm root -g 2>/dev/null)/playwright" "$PWD/node_modules/playwright"; do [ -d "$p" ] && PW="$p" && break; done
if [ -z "$PW" ]; then
  npm i --no-save playwright >&2
  [ -n "$PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD" ] || npx playwright install chromium >&2
  PW="$PWD/node_modules/playwright"
fi

echo "export FFMPEG='$FF' PLAYWRIGHT_PATH='$PW'"
