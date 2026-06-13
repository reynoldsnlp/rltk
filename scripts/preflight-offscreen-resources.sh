#!/usr/bin/env bash
set -euox pipefail

usage() {
  cat <<'EOF'
Usage: scripts/preflight-offscreen-resources.sh [--force] [--online]

Checks required offscreen resources (CG3 + HFSTOL). If any are missing or
broken symlinks, attempts to restore them:
  - If LANGRUS_DIR file exists (and --online not set), copy from that path.
  - Otherwise download from the upstream URLs.

Flags:
  --force   Copy/download even if files already exist.
  --online  Skip LANGRUS_DIR and only use online sources.
EOF
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Shared resources are canonical under docs/rltk (src/rltk/resources is a symlink).
RES_DIR="$ROOT_DIR/docs/rltk/resources/models"

FORCE=0
ONLINE=0

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --online) ONLINE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 2 ;;
  esac
done

REQUIRED_HFSTOL=(
  "analyser-gt-desc-L2.hfstol"
  "generator-gt-norm.hfstol"
  "g2p.hfstol"
  "generator-gt-norm.accented.hfstol"
)
REQUIRED_PMHFST=(
  "tokeniser-disamb-gt-desc.pmhfst"
)
REQUIRED_CG3=(
  "disambiguator.cg3"
)

is_broken_or_missing() {
  local path="$1"
  if [ -L "$path" ] && [ ! -e "$path" ]; then
    return 0
  fi
  if [ ! -e "$path" ]; then
    return 0
  fi
  return 1
}

copy_file() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  cp -f --remove-destination "$src" "$dest"
}

download_file() {
  local url="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  local tmp="${dest}.tmp"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$tmp"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp" "$url"
  else
    echo "Neither curl nor wget is available for downloading $url" >&2
    exit 3
  fi
  mv -f "$tmp" "$dest"
}

missing=()
for file in "${REQUIRED_HFSTOL[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    missing+=("$file")
  fi
done
for file in "${REQUIRED_PMHFST[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    missing+=("$file")
  fi
done
for file in "${REQUIRED_CG3[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    missing+=("$file")
  fi
done

if [ "$FORCE" -eq 0 ] && [ "${#missing[@]}" -eq 0 ]; then
  echo "Preflight: all required offscreen resources are present."
  exit 0
fi

LANGRUS_PATH=""
USE_LOCAL=0
if [ "$ONLINE" -eq 0 ] && [ -f "$ROOT_DIR/LANGRUS_DIR" ]; then
  LANGRUS_PATH="$(tr -d '\r\n' < "$ROOT_DIR/LANGRUS_DIR")"
  if [ -n "$LANGRUS_PATH" ] && [ -d "$LANGRUS_PATH" ]; then
    USE_LOCAL=1
  else
    echo "Preflight: LANGRUS_DIR exists but does not point to a valid directory." >&2
  fi
fi

if [ "$USE_LOCAL" -eq 1 ]; then
  local_missing=()
  for file in "${REQUIRED_HFSTOL[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      src="$LANGRUS_PATH/src/fst/$file"
      if [ -f "$src" ]; then
        echo "Preflight: copying $file from LANGRUS_DIR."
        copy_file "$src" "$RES_DIR/$file"
      else
        local_missing+=("$file")
      fi
    fi
  done
  for file in "${REQUIRED_PMHFST[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      src="$LANGRUS_PATH/tools/tokenisers/$file"
      if [ -f "$src" ]; then
        echo "Preflight: copying $file from LANGRUS_DIR."
        copy_file "$src" "$RES_DIR/$file"
      else
        local_missing+=("$file")
      fi
    fi
  done
  for file in "${REQUIRED_CG3[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      src="$LANGRUS_PATH/src/cg3/$file"
      if [ -f "$src" ]; then
        echo "Preflight: copying $file from LANGRUS_DIR."
        copy_file "$src" "$RES_DIR/$file"
      else
        local_missing+=("$file")
      fi
    fi
  done

  if [ "${#local_missing[@]}" -gt 0 ]; then
    echo "Preflight: missing in LANGRUS_DIR: ${local_missing[*]}" >&2
    if [ "$ONLINE" -eq 0 ]; then
      echo "Preflight: re-run with --online to download missing files." >&2
      exit 1
    fi
  fi
fi

if [ "$USE_LOCAL" -eq 0 ] || [ "$ONLINE" -eq 1 ]; then
  HFSTOL_BASE_URL="https://pkg.pjj.cc/f/n/gs/giella-rus/usr/share/giella/rus"
  PMHFST_BASE_URL="https://pkg.pjj.cc/f/n/gs/giella-rus/usr/share/giella/rus"
  CG3_URL="https://raw.githubusercontent.com/giellalt/lang-rus/refs/heads/main/src/cg3/disambiguator.cg3"
  BACKUP_BASE_URL="https://icall.byu.edu/lang-rus"

  for file in "${REQUIRED_PMHFST[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      echo "Preflight: downloading $file."
      if ! download_file "$PMHFST_BASE_URL/$file" "$RES_DIR/$file"; then
        echo "Preflight: primary download failed for $file, trying backup."
        download_file "$BACKUP_BASE_URL/$file" "$RES_DIR/$file"
      fi
    fi
  done
  for file in "${REQUIRED_CG3[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      echo "Preflight: downloading $file."
      if ! download_file "$CG3_URL" "$RES_DIR/$file"; then
        echo "Preflight: primary download failed for $file, trying backup."
        download_file "$BACKUP_BASE_URL/$file" "$RES_DIR/$file"
      fi
    fi
  done
  for file in "${REQUIRED_HFSTOL[@]}"; do
    if [ "$FORCE" -eq 1 ] || is_broken_or_missing "$RES_DIR/$file"; then
      echo "Preflight: downloading $file."
      if ! download_file "$HFSTOL_BASE_URL/$file" "$RES_DIR/$file"; then
        echo "Preflight: primary download failed for $file, trying backup."
        download_file "$BACKUP_BASE_URL/$file" "$RES_DIR/$file"
      fi
    fi
  done
fi

final_missing=()
for file in "${REQUIRED_HFSTOL[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    final_missing+=("$file")
  fi
done
for file in "${REQUIRED_PMHFST[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    final_missing+=("$file")
  fi
done
for file in "${REQUIRED_CG3[@]}"; do
  if is_broken_or_missing "$RES_DIR/$file"; then
    final_missing+=("$file")
  fi
done

if [ "${#final_missing[@]}" -gt 0 ]; then
  echo "Preflight: still missing: ${final_missing[*]}" >&2
  exit 1
fi

echo "Preflight: required offscreen resources are ready."
