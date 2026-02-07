#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT_DIR / "src" / "rltk" / "resources" / "models" / "root_parses.tsv"
OUTPUT_PATH = ROOT_DIR / "src" / "rltk" / "resources" / "models" / "root_parses.json"


def parse_segment(segment: str):
    segment = segment.strip()
    if not segment:
        return None
    idx = segment.rfind("_")
    if idx == -1:
        return [segment, ""]
    return [segment[:idx], segment[idx + 1 :]]


def main():
    result = {}
    for line in INPUT_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        cols = line.split("\t")
        if len(cols) < 4:
            continue
        lemma = cols[2].strip().replace("-", "")
        parse_raw = cols[3].strip()
        if not lemma or not parse_raw:
            continue
        parse = [seg for seg in (parse_segment(s) for s in parse_raw.split("|")) if seg]
        result[lemma] = parse

    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(result)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
