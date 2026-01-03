#!/usr/bin/env bash

set -e

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 [hfst|cg3] [debug|optimized]"
  exit 1
fi

LIB_TYPE="$1"
BUILD_TYPE="$2"

# Remove existing symlinks
rm -f "lib${LIB_TYPE}.js" "lib${LIB_TYPE}.wasm"

# Create new symlinks based on arguments
ln -s "lib${LIB_TYPE}-${BUILD_TYPE}.js" "lib${LIB_TYPE}.js"
ln -s "lib${LIB_TYPE}-${BUILD_TYPE}.wasm" "lib${LIB_TYPE}.wasm"

echo "Activated lib${LIB_TYPE}-${BUILD_TYPE}."
