#!/usr/bin/env bash
# Prints a working ffmpeg path. Uses the system ffmpeg if it runs, otherwise a
# private venv with imageio-ffmpeg (static binary). Homebrew ffmpeg often breaks
# after a dependency bump (dyld: libx265 not loaded), and system pip is blocked
# by PEP 668, so the venv is the reliable fallback.
set -u
if command -v ffmpeg >/dev/null 2>&1 && [ "$( { ffmpeg -version >/dev/null 2>&1 && echo y; } 2>/dev/null )" = y ]; then
  command -v ffmpeg; exit 0
fi
VENV=${SKOOL_STUDY_VENV:-$HOME/.cache/skool-study/venv}
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV" >&2 || { echo "cannot create venv at $VENV" >&2; exit 1; }
  "$VENV/bin/pip" -q --disable-pip-version-check install imageio-ffmpeg >&2 || { echo "pip install imageio-ffmpeg failed" >&2; exit 1; }
fi
"$VENV/bin/python" -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
