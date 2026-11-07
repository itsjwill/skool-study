---
name: skool-study
version: 1.0.0
description: Study a whole Skool course for the user. Maps every lesson in a Skool classroom they are a member of (via Claude in Chrome), pulls transcripts for every video (Skool-native Mux captions, Loom and other hosts via yt-dlp + local whisper.cpp, YouTube via the in-page transcript panel), saves the instructor's written notes, then studies the course into per-section notes, a PLAYBOOK and an INDEX, flagging outdated or wrong advice. Trigger on "study this skool course", "watch the skool videos", "pull the skool course", "transcribe this course", "go through the classroom", a skool.com/<group>/classroom link, or "/skool-study".
---

# Skool Study

Turn a Skool classroom into text the user (and future sessions) can search and act on: every lesson transcribed, the instructor's written notes kept, and a playbook that says what to actually do.

Only for communities the user is a logged-in member of. Content stays local and private: never commit transcripts, notes or media to a public repo, never publish them.

Scripts live in `scripts/` next to this file. Run Python ones with `python3 -I`.

## Step 0: Setup (once per machine)

`bash scripts/setup.sh` installs yt-dlp, whisper.cpp (`whisper-cli`) and the `ggml-base.en` model (~150MB, free, runs locally), and prints a working ffmpeg. `scripts/find_ffmpeg.sh` falls back to a private venv with `imageio-ffmpeg` when the system ffmpeg is broken (Homebrew ffmpeg breaks after dependency bumps: `dyld: Library not loaded ... libx265`).

## Step 1: Pick the output folder

Default `./course/<group>/` in the current project (create `raw/`, `transcripts/`, `notes/`). If the user already has a course folder for this group, reuse it: every script skips lessons already done, so re-runs are cheap.

## Step 2: Map the classroom (Claude in Chrome)

1. Load the Chrome tools in one ToolSearch call, `tabs_context_mcp`, open a NEW tab on `https://www.skool.com/<group>/classroom`. If it shows a login or join page, stop and tell the user to sign in in that tab.
2. Run `scripts/skool_map.js` with the javascript tool (pass the file contents). It walks every course and lesson from `__NEXT_DATA__`, and for lessons with no external link it fetches the lesson page to get the Mux `playbackId` + `playbackToken` and the lesson's written description. It returns counts only: `{courses, skipped, lessons, loom, youtube, otherLink, mux, noVideo}`. Locked courses come back in `skipped`; tell the user which.
3. Export: run `scripts/export_clipboard.js`, click the green button with the computer tool (clipboard needs a real click), then `pbpaste > <dir>/raw/lessons.json`. Do not try to return the JSON through the javascript tool: output containing URLs with query strings gets blocked.
4. Counts 0 or obviously wrong: inspect `JSON.parse(document.getElementById('__NEXT_DATA__').textContent).props.pageProps` keys and adjust `pick()` in the script. Skool renames fields occasionally.

Report the lesson count and host mix to the user in one line, with a time estimate (whisper base.en runs ~10x realtime on Apple Silicon: a 30 min Loom takes ~1-3 min including download).

## Step 3: Pull transcripts by host

Run the fast ones first, in parallel, in the background:

| Host | Command | Notes |
|---|---|---|
| Skool-native (Mux) | `python3 -I scripts/mux_captions.py <dir>` | Reads Mux caption track directly, no download. Needs the Skool Referer (built in). 403 = token expired: re-run Step 2. `NOSUBS` = no captions: whisper it (yt-dlp accepts the `stream.mux.com/<pid>.m3u8?token=` URL; add it to the TSV). |
| Loom, Vimeo, Wistia, anything yt-dlp handles | `python3 -I scripts/lessons_to_tsv.py <dir>` then `bash scripts/transcribe.sh <dir>/raw/video_links.tsv <dir>` | Audio only, 16kHz mono, whisper base.en. Add `--frames` when lessons are screen shares or slides: 1 frame every 30s into `frames/`, read them to capture what's on screen. |
| YouTube | try `transcribe.sh` first; on `DLFAIL` use the browser | YouTube usually blocks scripted subs (429) and audio (403). In Chrome, open each watch page, set `KEY` in `scripts/yt_transcript.js` to the lesson's `NN_slug`, run it. After the last one, `export_clipboard.js` on youtube.com, `pbpaste > <dir>/raw/yt.json`, then `python3 -I scripts/lessons_to_tsv.py <dir> --yt <dir>/raw/yt.json`. |
| No video (text lessons) | nothing to pull | The written description is already in `lessons.json` `notes`. |

Also write each lesson's `notes` (instructor's written SOP) to `notes/NN_slug.md`. These are often the most precise part of the course.

Before moving on, check coverage: every lesson in `lessons.json` has a transcript or notes. List gaps to the user; do not silently skip.

Gotchas:
- Inside `while read` loops, ffmpeg and whisper eat stdin; the scripts already pass `</dev/null`. Keep that if you edit them.
- Long runs: launch with `run_in_background` and wait for `ALLDONE`; don't poll.
- Transcripts are whisper base.en: names, brands and numbers can be misheard. Cross-check any number you put in the playbook against the notes or frames.

## Step 4: Study the course

Split the lessons into sections (by course, or ~10-15 lessons per chunk). For each section spawn a subagent with: the transcript and notes file paths for that chunk, and this brief:

> Read every file. Write `notes/SUMMARY_<letter>_<section>.md`: per lesson, the concrete rules, numbers, settings, tools, templates and examples (quote exact numbers). Then a section summary: what to do, in order. Flag anything contradicted elsewhere, anything that sounds outdated, and any math or claim that looks wrong, with the reason.

Subagents that cannot write files: tell them to reply with `===== BEGIN FILE: /abs/path =====` ... `===== END FILE =====` blocks and recover with `python3 -I scripts/extract_file_blocks.py <agent output file>`.

Then write, yourself:

- **`PLAYBOOK.md`**: the course as an operating manual. Steps in order, with the exact numbers and settings. Where lessons disagree, the newest teaching wins (live classes and recent updates override old core modules); say which lesson each rule comes from. Check the math yourself (breakeven formulas, budgets, ROAS, conversion math) and correct it openly when the course is wrong.
- **`INDEX.md`**: every lesson, one line: number, title, minutes, source type, file path, one-line takeaway.

Then tell the user, briefly: lesson count covered, gaps, the 5 rules that matter most, and anything the course gets wrong. Give your opinion on what to apply first to their situation.

## Step 5: Remember it

Save a memory pointing at the folder, PLAYBOOK and INDEX, plus any non-obvious extraction gotcha you hit (so the next course goes faster).
