#!/usr/bin/env python3
"""Build video_links.tsv (index, url, slug) from lessons.json for transcribe.sh,
and write yt_transcripts JSON exported from Chrome into transcripts/.

usage: python3 -I lessons_to_tsv.py <course_dir>                 -> raw/video_links.tsv
       python3 -I lessons_to_tsv.py <course_dir> --yt <yt.json>  -> transcripts/*.txt
"""
import json, os, re, sys

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:70]

base = os.path.expanduser(sys.argv[1])
L = json.load(open(f"{base}/raw/lessons.json"))["lessons"]
if len(sys.argv) > 3 and sys.argv[2] == "--yt":
    yt = json.load(open(sys.argv[3]))
    os.makedirs(f"{base}/transcripts", exist_ok=True)
    for key, text in yt.items():
        with open(f"{base}/transcripts/{key}.txt", "w") as f:
            f.write(f"# {key}\n# source: youtube transcript panel\n\n{text}\n")
        print("wrote", key)
    sys.exit()
rows = []
for l in L:
    if l.get("videoLink"):
        url = re.sub(r"[&?](t=\d+s?|sid=[\w-]+)$", "", l["videoLink"])
        rows.append(f"{l['i']}\t{url}\t{slug(l['path'].split('>')[-1])}")
with open(f"{base}/raw/video_links.tsv", "w") as f:
    f.write("\n".join(rows) + "\n")
print(len(rows), "links ->", f"{base}/raw/video_links.tsv")
