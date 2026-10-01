#!/usr/bin/env bash
# One command from your app's published singles to a finished video.
#
#   bash video/daily.sh picks                       today's latest session
#   bash video/daily.sh results                     every single published today, once settled
#   bash video/daily.sh picks --session morning     or midday / evening / all
#   bash video/daily.sh results --date 2026-09-30 --money ngn
#
# Prints the finished video, a copy small enough to send in chat (under 29 MB), and the caption + credits files.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?say picks or results}"; shift || true

eval "$(bash video/setup.sh)"
export FFMPEG PLAYWRIGHT_PATH

JSON=$(node video/from-app.mjs "$MODE" "$@")
SLUG=$(basename "$JSON" .json)
node video/make-video.mjs "$JSON"

OUT="video/out/$SLUG"
MP4="$OUT/$SLUG.mp4"
SEND="$OUT/${SLUG}_send.mp4"
# two-pass encode to fit a 29 MB chat limit (full 1080×1920; the full-quality file is kept for posting)
DUR=$("$FFMPEG" -i "$MP4" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | awk -F: '{print $1*3600+$2*60+$3}')
KBPS=$(awk -v d="$DUR" 'BEGIN{b=int(29*8*1000/d)-180; if(b>8000)b=8000; print b}')
"$FFMPEG" -loglevel error -y -i "$MP4" -c:v libx264 -preset slow -b:v "${KBPS}k" -pass 1 -passlogfile "$OUT/2pass" -an -f mp4 /dev/null
"$FFMPEG" -loglevel error -y -i "$MP4" -c:v libx264 -preset slow -b:v "${KBPS}k" -pass 2 -passlogfile "$OUT/2pass" -c:a aac -b:a 160k -pix_fmt yuv420p -movflags +faststart "$SEND"
rm -f "$OUT"/2pass*

echo
echo "VIDEO   $MP4"
echo "SEND    $SEND ($(du -h "$SEND" | cut -f1))"
echo "SCRIPT  $OUT/script.txt"
echo "CREDITS $OUT/credits.txt"
