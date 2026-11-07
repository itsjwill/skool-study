#!/usr/bin/env python3
"""Pull captions for Skool-native (Mux hosted) lessons. No download, no whisper.

usage: python3 -I mux_captions.py <course_dir>

Reads <course_dir>/raw/lessons.json (see SKILL.md for the schema). For every lesson
with mux_pid + mux_tok it fetches stream.mux.com/{pid}.m3u8?token=..., finds the
SUBTITLES track, downloads its .vtt segments, de-duplicates lines and writes
<course_dir>/transcripts/NN_slug.txt. Existing files are skipped.
Lessons whose stream has no captions print NOSUBS (send those through whisper:
yt-dlp can read the same m3u8 URL).

Tokens expire (JWT exp claim, usually days). If you get 403, re-run the lesson
mapping in Chrome to refresh mux_tok.
"""
import json, os, re, sys, urllib.request
from urllib.parse import urljoin

# Skool tokens carry a playback restriction: Mux checks the Referer/Origin.
UA = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.skool.com/", "Origin": "https://www.skool.com"}

def get(u):
    req = urllib.request.Request(u, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:70]

def subs_uri(master_url):
    for line in get(master_url).splitlines():
        if line.startswith("#EXT-X-MEDIA") and "TYPE=SUBTITLES" in line:
            m = re.search(r'URI="([^"]+)"', line)
            if m:
                return urljoin(master_url, m.group(1))
    return None

def vtt_text(playlist_url):
    pl = get(playlist_url)
    segs = [urljoin(playlist_url, x.strip()) for x in pl.splitlines() if x.strip() and not x.startswith("#")]
    if not segs:  # playlist URL was the .vtt itself
        segs = [playlist_url]
    out, last = [], None
    for s in segs:
        for ln in get(s).splitlines():
            ln = ln.strip()
            if (not ln or ln.startswith(("WEBVTT", "X-TIMESTAMP", "NOTE")) or "-->" in ln
                    or re.fullmatch(r"\d+", ln)):
                continue
            ln = re.sub(r"<[^>]+>", "", ln)
            if ln != last:
                out.append(ln)
                last = ln
    return " ".join(out)

def main():
    base = os.path.expanduser(sys.argv[1])
    lessons = json.load(open(f"{base}/raw/lessons.json"))["lessons"]
    os.makedirs(f"{base}/transcripts", exist_ok=True)
    for l in lessons:
        if not l.get("mux_pid"):
            continue
        name = f"{l['i']:02d}_{slug(l['path'].split('>')[-1])}"
        out = f"{base}/transcripts/{name}.txt"
        if os.path.exists(out):
            continue
        try:
            uri = subs_uri(f"https://stream.mux.com/{l['mux_pid']}.m3u8?token={l['mux_tok']}")
            if not uri:
                print("NOSUBS", name, flush=True)
                continue
            txt = vtt_text(uri)
        except Exception as e:
            print("FAIL", name, e, flush=True)
            continue
        with open(out, "w") as f:
            f.write(f"# {l.get('course','')} :: {l['path']}\n# source: mux captions, {l.get('mux_min',0)} min\n\n{txt}\n")
        print("DONE", name, len(txt.split()), "words", flush=True)
    print("ALLDONE")

if __name__ == "__main__":
    main()
