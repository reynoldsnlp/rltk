#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT_DIR / "src" / "rltk" / "resources" / "models" / "roots_definitions.json"
OUTPUT_PATH = ROOT_DIR / "src" / "rltk" / "resources" / "models" / "roots_definitions2.json"

OR_SPLIT = " OR "
PAREN_RE = re.compile(r"\s*\(([^()]*)\)\s*$")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")


def normalize_entry(key: str, value: str) -> str:
    parts = value.split(OR_SPLIT)
    entries = []
    for part in parts:
        part = part.strip()
        root = key
        m = PAREN_RE.search(part)
        if m:
            paren_root = m.group(1).strip()
            part = PAREN_RE.sub("", part).strip()
            if CYRILLIC_RE.search(paren_root):
                root = paren_root
        root_label = root.upper()
        entries.append(f"{root_label}: {part}")
    return "; ".join(entries)


def main() -> None:
    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    updated = {k: normalize_entry(k, v) for k, v in data.items()}
    OUTPUT_PATH.write_text(json.dumps(updated, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    print(f"Wrote {len(updated)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
