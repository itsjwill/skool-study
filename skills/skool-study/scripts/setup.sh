#!/usr/bin/env bash
# One-time setup: yt-dlp, whisper.cpp, the base.en model, and a working ffmpeg.
set -eu
MODEL=${WHISPER_MODEL:-$HOME/models/ggml-base.en.bin}
if command -v brew >/dev/null 2>&1; then
  command -v yt-dlp >/dev/null || brew install yt-dlp
  command -v whisper-cli >/dev/null || brew install whisper-cpp
else
  command -v yt-dlp >/dev/null || python3 -m pip install --user yt-dlp
  command -v whisper-cli >/dev/null || { echo "install whisper.cpp (whisper-cli) for your OS"; exit 1; }
fi
if [ ! -s "$MODEL" ]; then
  mkdir -p "$(dirname "$MODEL")"
  curl -L -o "$MODEL" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
fi
FF=$("$(dirname "$0")/find_ffmpeg.sh")
echo "yt-dlp:      $(command -v yt-dlp)"
echo "whisper-cli: $(command -v whisper-cli)"
echo "model:       $MODEL"
echo "ffmpeg:      $FF"
