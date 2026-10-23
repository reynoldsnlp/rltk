#!/usr/bin/env bash
# Copies the L2 error explanations from reynoldsnlp/rus_grammar_explanations
# into docs/rltk/resources/explanations/eng/ so the extension bundles them
# (the Chrome Web Store forbids loading remote content into extension pages).
#
# Uses a sibling checkout (../rus_grammar_explanations) if present, otherwise
# downloads the main branch from GitHub. If neither is available, keeps the
# committed copies and exits successfully with a warning.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT_DIR/docs/rltk/resources/explanations/eng"
LOCAL_SRC="$ROOT_DIR/../rus_grammar_explanations/html/eng"
TARBALL_URL="https://github.com/reynoldsnlp/rus_grammar_explanations/archive/refs/heads/main.tar.gz"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ -d "$LOCAL_SRC" ]; then
    echo "Explanations: copying from $LOCAL_SRC"
    SRC="$LOCAL_SRC"
elif curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP"; then
    echo "Explanations: downloaded from GitHub"
    SRC="$TMP/rus_grammar_explanations-main/html/eng"
else
    echo "Explanations: WARNING: source unavailable; keeping committed copies." >&2
    exit 0
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$SRC"/*.html "$DEST/"
