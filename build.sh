#!/bin/sh
# The Ostrich, Plate VII — one-command build: voice → events → score → mix → frames → film.
# Needs the Lemo-Opuscar library:  LIB=/path/to/lemo-opuscar sh build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../lemo-opuscar" 2>/dev/null && pwd || echo "$HOME/lemo-opuscar")}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
cd "$LIB"

# 1. narration (cached in voices/)
if [ ! -f "$HERE/voices/l6.wav" ]; then
  .venv/bin/python core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
  .venv/bin/python core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang en
fi
# 2. sound/cue events from the page
node core/render/events.mjs "$HERE"
# 3. score + mix (foley, room, ducked music, narration)
"$LIB/.venv/bin/python" "$HERE/music/score.py"
"$LIB/.venv/bin/python" "$HERE/mix.py"
# 4. frames + film (grain 1: laid paper carries its own tooth)
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/ostrich-plate.mp4" 24 1
# 5. checks + subtitles + poster
node core/render/readcheck.mjs "$HERE" || true
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/cues.json" "$HERE/ostrich-plate.srt"
node core/render/still.mjs "$HERE" 56.8 --prefix poster_ --out "$HERE"
[ -f "$HERE/poster_t_56.8.jpg" ] && mv "$HERE/poster_t_56.8.jpg" "$HERE/poster.jpg"
echo "film: $HERE/ostrich-plate.mp4"
