#!/usr/bin/env python3
"""Recover files that a subagent returned as text blocks.

Some subagents cannot write files. Have them reply with:
    ===== BEGIN FILE: /abs/path/notes.md =====
    ...content...
    ===== END FILE =====
then run:  python3 -I extract_file_blocks.py <agent_output.jsonl_or_txt>
Writes every block to its path (longest copy wins if repeated).
"""
import json, re, sys

PAT = re.compile(r"=+ BEGIN FILE: (\S+) =+\n(.*?)\n\s*=+ END FILE =+", re.S)
found = {}

def walk(x):
    if isinstance(x, str):
        for m in PAT.finditer(x):
            if len(m.group(2)) >= len(found.get(m.group(1), "")):
                found[m.group(1)] = m.group(2)
    elif isinstance(x, dict):
        for v in x.values():
            walk(v)
    elif isinstance(x, list):
        for v in x:
            walk(v)

raw = open(sys.argv[1]).read()
walk(raw)
for line in raw.splitlines():
    try:
        walk(json.loads(line))
    except Exception:
        pass
for path, body in found.items():
    lines = body.splitlines()
    if lines and all(l.startswith("  ") or not l.strip() for l in lines):
        body = "\n".join(l[2:] for l in lines)
    with open(path, "w") as f:
        f.write(body.strip() + "\n")
    print("wrote", path, len(body))
if not found:
    print("NONE")
