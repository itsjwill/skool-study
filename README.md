# SKOOL STUDY: Claude Code Skill That Studies a Skool Course for You

<div align="center">

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin_+_Skill-purple?style=for-the-badge)

</div>

> Paste a `skool.com/<group>/classroom` link into Claude Code and say "study this course". It maps every lesson, pulls a transcript for every video, keeps the instructor's written notes, and turns 50+ hours of video into a playbook you can act on, with the outdated and wrong advice flagged.

```
/plugin install skool-study --marketplace itsjwill/skool-study
```

Only works on communities you are a logged-in member of. Everything stays on your machine.

## How it works

```
1. MAP         Claude in Chrome reads the classroom: every course, module and lesson, video host, length, written notes
2. MUX         Skool-native videos: reads the caption track directly (no download)
3. WHISPER     Loom, Vimeo, Wistia, anything yt-dlp supports: audio only, transcribed locally by whisper.cpp (free)
4. YOUTUBE     when YouTube blocks downloads, reads the transcript panel in the browser instead
5. COVERAGE    every lesson has a transcript or notes, or it is listed as a gap
6. STUDY       parallel agents write deep per-section notes with exact numbers
7. PLAYBOOK    one operating manual, newest teaching wins, math checked, plus a one-line-per-lesson INDEX
```

## Output

```
course/<group>/
  raw/lessons.json        full lesson map
  transcripts/NN_slug.txt one per video
  notes/NN_slug.md        instructor's written lesson notes
  notes/SUMMARY_*.md      per-section deep notes
  PLAYBOOK.md             what to do, in order, with numbers
  INDEX.md                every lesson, one line
```

## Requirements

- Claude Code with the Claude in Chrome extension (to read the classroom while signed in)
- `bash skills/skool-study/scripts/setup.sh` installs yt-dlp, whisper.cpp and the base.en model. Broken system ffmpeg is handled automatically (static ffmpeg in a private venv).

## Scripts

| Script | What it does |
|---|---|
| `skool_map.js` | In-browser: maps every course and lesson, Mux playback ids, written notes |
| `export_clipboard.js` | In-browser: copies big JSON out via a real click, then `pbpaste` |
| `mux_captions.py` | Skool-native lesson captions straight from the Mux stream |
| `lessons_to_tsv.py` | lessons.json to a download list; also imports YouTube transcripts |
| `transcribe.sh` | yt-dlp audio + whisper.cpp, resumable, optional slide frames |
| `yt_transcript.js` | In-browser: YouTube transcript panel fallback |
| `extract_file_blocks.py` | Recovers files from subagent replies |
| `find_ffmpeg.sh` / `setup.sh` | Tooling |

## Trigger phrases

`study this skool course`, `watch the skool videos`, `pull the skool course`, `transcribe this course`, `/skool-study`, or just paste a classroom link.

## Use responsibly

For personal study of courses you paid for or joined. Do not redistribute course content. Respect the creator and the community's rules.

## License

MIT
