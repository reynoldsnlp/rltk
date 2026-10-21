#!/usr/bin/env python3
"""Build the POS-aware reference frequency list for the Vocabulary subtab.

Replaces the old ``convert_freq_dict.py`` (which shipped an ipm lemma list with no
POS from an ``udar`` pickle). This rebuilds the reference from Sergey Sharoff's newer
"robust frequency" corpora (https://ssharoff.github.io/frqc/), which apply
Winsorisation to suppress domain-specific frequency bursts.

Approach (see plan / repo notes):
  * Blend three consistently-tagged modern web corpora: ruTenTen, ruWac, GICR-news.
    (RNC uses an incompatible tagset; CCNet ships no POS; ru-maximus 404s -- all dropped.)
  * Each list is a headerless TSV: ``word_POS \t raw \t robust \t winsor_docs \t docfreq``.
    We use the *robust* (Winsorised) column.
  * Split ``word`` on the last ``_`` into lemma + single-letter POS code, map the code to
    a canonical POS, normalise the lemma to match the extension's JS lookup (lowercase,
    fold ё->е, strip stress/combining marks; keep Cyrillic-letters-only lemmas).
  * Convert each corpus's robust counts to instances-per-million (ipm).
  * Blend across corpora: for each ``lemma+POS`` present in >=2 corpora, take the
    geometric mean of its per-corpus ipm (robust central tendency, down-weights
    single-corpus spikes; the >=2 rule filters crawl noise).
  * Keep the top --top-n keys by blended ipm, then renormalise to sum to 1e6 so the
    reference keeps ipm semantics.

Output: ``docs/rltk/resources/models/Sharoff_frqc_lempos_freq.json`` -> ``{"lemma+POS": ipm}``.

Keys join lemma and the *canonical* POS with ``+`` (e.g. ``стать+V``), matching the
gt-desc analyzer's own generation format used by the extension.

Run: ``python3 scripts/build_freq_dict.py`` (downloads ~32 MB to a temp cache on first run).
"""

import argparse
import json
import lzma
import math
import os
import sys
import tempfile
import unicodedata
import urllib.request
from collections import defaultdict

BASE_URL = "https://ssharoff.github.io/frqc/ru"

# Corpora to blend: (label, remote filename). Consistent single-letter POS tagset.
CORPORA = [
    ("ruTenTen", "ruTenTen.vert.xz.lpos-clean2-biwt.tsv.xz"),
    ("ruWac", "ruwac.out.gz.lpos-clean2-biwt.tsv.xz"),
    ("GICR", "gicr-news.out.xz.lpos-clean2-biwt.tsv.xz"),
]

# frqc single-letter POS code -> canonical POS (must match the JS analyzer-tag mapping
# POS_TO_CANONICAL in docs/rltk/utils/freq-keys.js). Codes not listed here (e.g. "-",
# junk) are dropped.
FRQC_POS = {
    "n": "N",     # noun
    "a": "A",     # adjective
    "v": "V",     # verb
    "r": "Adv",   # adverb
    "p": "Pron",  # pronoun
    "s": "Pr",    # preposition (adposition)
    "c": "Conj",  # conjunction
    "q": "Pcle",  # particle
    "i": "Intj",  # interjection
    "m": "Num",   # numeral
}

STRESS_MARKS = {"̀", "́"}  # grave / acute combining accents


def normalize_lemma(lemma):
    """Normalise a lemma to the same canonical form the JS lookup uses.

    Lowercase, fold ё->е, drop stress/combining marks and digits. Returns the
    normalised lemma iff it is non-empty and made only of Russian Cyrillic letters;
    otherwise returns None (so Latin/digit/punctuation/hyphenated junk is dropped,
    mirroring content.js's Cyrillic-letters-only filter).
    """
    lemma = lemma.lower().replace("ё", "е")
    lemma = "".join(ch for ch in lemma if ch not in STRESS_MARKS and not ch.isdigit())
    # Drop any remaining combining marks.
    lemma = "".join(ch for ch in lemma if not unicodedata.combining(ch))
    if not lemma:
        return None
    # Russian Cyrillic lowercase letters only (а-я, ё already folded to е).
    if any(not ("а" <= ch <= "я") for ch in lemma):
        return None
    return lemma


def cache_path(cache_dir, filename):
    return os.path.join(cache_dir, filename)


def ensure_downloaded(cache_dir, filename):
    path = cache_path(cache_dir, filename)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    url = f"{BASE_URL}/{filename}"
    print(f"  downloading {url} ...", flush=True)
    tmp = path + ".part"
    urllib.request.urlretrieve(url, tmp)
    os.replace(tmp, path)
    return path


def corpus_ipm(label, path):
    """Parse one .tsv.xz corpus -> {(lemma, canonical_pos): ipm}.

    ipm is computed against the corpus token total (sum of robust counts over all rows,
    including function words and dropped junk) so proportions are corpus-relative.
    """
    per_key_robust = defaultdict(float)
    corpus_total = 0.0
    rows = 0
    with lzma.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            word = parts[0]
            try:
                robust = float(parts[2])
            except ValueError:
                continue
            rows += 1
            corpus_total += robust
            if "_" not in word:
                continue
            lemma_raw, code = word.rsplit("_", 1)
            pos = FRQC_POS.get(code)
            if pos is None:
                continue
            lemma = normalize_lemma(lemma_raw)
            if lemma is None:
                continue
            per_key_robust[(lemma, pos)] += robust
    if corpus_total <= 0:
        raise RuntimeError(f"{label}: empty corpus total")
    scale = 1_000_000.0 / corpus_total
    ipm = {key: robust * scale for key, robust in per_key_robust.items()}
    print(f"  {label}: {rows:,} rows -> {len(ipm):,} normalised lemma+POS keys")
    return ipm


def build(cache_dir, top_n, min_corpora):
    print(f"Cache dir: {cache_dir}")
    per_corpus = []
    for label, filename in CORPORA:
        path = ensure_downloaded(cache_dir, filename)
        per_corpus.append((label, corpus_ipm(label, path)))

    # Blend: geometric mean of per-corpus ipm over the corpora where the key appears,
    # keeping only keys present in at least `min_corpora` corpora.
    present = defaultdict(list)
    for _label, ipm in per_corpus:
        for key, value in ipm.items():
            present[key].append(value)

    blended = {}
    for key, values in present.items():
        if len(values) < min_corpora:
            continue
        log_sum = sum(math.log(v) for v in values)
        blended[key] = math.exp(log_sum / len(values))

    dropped_sparse = len(present) - len(blended)
    print(
        f"Blended: {len(present):,} distinct keys, "
        f"{dropped_sparse:,} dropped (present in < {min_corpora} corpora)"
    )

    # Keep the top-N by blended ipm to bound the shipped JSON.
    ranked = sorted(blended.items(), key=lambda kv: kv[1], reverse=True)
    if top_n and len(ranked) > top_n:
        dropped_tail = len(ranked) - top_n
        print(f"Keeping top {top_n:,} keys; dropping {dropped_tail:,} lower-frequency keys")
        ranked = ranked[:top_n]

    # Renormalise kept values to sum to 1e6 (keep ipm semantics for downstream code).
    total = sum(v for _k, v in ranked)
    scale = 1_000_000.0 / total
    out = {f"{lemma}+{pos}": round(value * scale, 4) for (lemma, pos), value in ranked}
    return out


def spot_check(freq):
    print("\nSpot checks:")
    for key in ["стать+V", "стать+N", "печь+N", "печь+V", "и+Conj", "год+N", "россия+N"]:
        print(f"  {key:>12}: {freq.get(key, '(absent)')}")


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_out = os.path.join(
        repo_root, "docs", "rltk", "resources", "models", "Sharoff_frqc_lempos_freq.json"
    )
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=default_out, help="output JSON path")
    ap.add_argument(
        "--cache-dir",
        default=os.path.join(tempfile.gettempdir(), "rltk_frqc_cache"),
        help="where to cache downloaded .tsv.xz files",
    )
    ap.add_argument("--top-n", type=int, default=50000, help="max keys to keep (0 = all)")
    ap.add_argument(
        "--min-corpora", type=int, default=2, help="keep keys present in >= this many corpora"
    )
    args = ap.parse_args()

    os.makedirs(args.cache_dir, exist_ok=True)
    try:
        freq = build(args.cache_dir, args.top_n, args.min_corpora)
    except Exception as e:  # noqa: BLE001 - surface any download/parse error clearly
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(freq, f, ensure_ascii=False)
    size = os.path.getsize(args.out)
    print(f"\nWrote {len(freq):,} keys to {args.out} ({size / 1_048_576:.2f} MiB)")
    spot_check(freq)


if __name__ == "__main__":
    main()
