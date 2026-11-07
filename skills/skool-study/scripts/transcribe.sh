#!/usr/bin/env bash
# Download audio for every lesson in a TSV and transcribe it locally with whisper.cpp.
#
# usage: transcribe.sh <video_links.tsv> <course_dir> [--frames]
#   TSV columns (tab separated): index  url  slug
#   Writes <course_dir>/transcripts/NN_slug.txt  (skips ones that already exist)
#   --frames also grabs 1 frame / 30s into <course_dir>/frames/NN_slug/ (slides, screen shares)
#
# Works for Loom, YouTube, Vimeo, Wistia and anything else yt-dlp supports.
# Prints DONE / DLFAIL / WFAIL per lesson and ALLDONE at the end.
# YouTube often refuses scripted downloads (403/429). Those lessons print DLFAIL;
# pull them in Chrome with yt_transcript.js instead.
set -u
TSV=$1; B=$2; FRAMES=${3:-}
HERE=$(cd "$(dirname "$0")" && pwd)
MODEL=${WHISPER_MODEL:-$HOME/models/ggml-base.en.bin}
THREADS=${WHISPER_THREADS:-8}
FF=$("$HERE/find_ffmpeg.sh") || { echo "no ffmpeg"; exit 1; }
[ -s "$MODEL" ] || { echo "missing whisper model $MODEL (run setup.sh)"; exit 1; }
A=$B/raw/audio; mkdir -p "$A" "$B/transcripts"

while IFS=$'\t' read -r i url slug; do
  [ -z "${url:-}" ] && continue
  n=$(printf %02d "$i")_$slug
  if [ ! -s "$B/transcripts/$n.txt" ]; then
    if [[ $url == *loom.com* ]]; then F="hls-raw-audio-audio/bestaudio"; else F="bestaudio[ext=m4a]/bestaudio/best"; fi
    if [ ! -s "$A/$n.wav" ]; then
      rm -f "$A/$n".src.*
      yt-dlp -q --no-warnings --ffmpeg-location "$FF" -f "$F" -o "$A/$n.src.%(ext)s" "$url" </dev/null \
        || { echo "DLFAIL $n $url"; continue; }
      src=$(ls "$A/$n".src.* 2>/dev/null | head -1)
      "$FF" -nostdin -loglevel error -y -i "$src" -ar 16000 -ac 1 "$A/$n.wav" </dev/null && rm -f "$src"
    fi
    whisper-cli -m "$MODEL" -f "$A/$n.wav" -nt -otxt -of "$A/$n" -t "$THREADS" </dev/null >/dev/null 2>&1 \
      || { echo "WFAIL $n"; continue; }
    { echo "# lesson $i :: $slug"; echo "# source: $url (whisper $(basename "$MODEL"))"; echo; tr '\n' ' ' < "$A/$n.txt"; echo; } > "$B/transcripts/$n.txt"
    rm -f "$A/$n.wav" "$A/$n.txt"
    echo "DONE $n $(wc -w < "$B/transcripts/$n.txt") words"
  fi
  if [ "$FRAMES" = "--frames" ] && [ ! -d "$B/frames/$n" ]; then
    if [[ $url == *loom.com* ]]; then VF="hls-raw-1500/best[height<=720]"; else VF="best[height<=720]/best"; fi
    V=$B/raw/video; mkdir -p "$V" "$B/frames/$n"
    yt-dlp -q --no-warnings --ffmpeg-location "$FF" -f "$VF" -o "$V/$n.%(ext)s" "$url" </dev/null || { echo "VFAIL $n"; continue; }
    v=$(ls "$V/$n".* 2>/dev/null | head -1)
    "$FF" -nostdin -loglevel error -y -i "$v" -vf "fps=1/30,scale=960:-1" "$B/frames/$n/f_%03d.jpg" </dev/null && rm -f "$v"
  fi
done < "$TSV"
echo ALLDONE
