#!/bin/bash
set -e

# Define paths
ROOT_DIR=$(pwd)
BUILD_DIR="build_tmp"
MANIFEST_PATH="$BUILD_DIR/src/manifest.json"
ZIP_NAME="rltk.zip"

# Clean up previous build
rm -rf "$BUILD_DIR"
rm -f "$ZIP_NAME"

# Check version against Chrome Web Store
echo "Checking version..."
python3 scripts/check_version.py
if [ $? -ne 0 ]; then
    echo "Version check failed. Aborting build."
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy src to build directory
echo "Copying src to $BUILD_DIR..."
cp -r src "$BUILD_DIR/"

# Remove host_permissions
python3 scripts/remove_host_permissions.py "$MANIFEST_PATH"

# Zip
echo "Zipping..."
cd "$BUILD_DIR"
zip -r "$ROOT_DIR/$ZIP_NAME" src -x "src/rltk/resources/models/morphberta-k/*" -x "src/rltk/resources/models/old/*" -x "*/.DS_Store"

# Clean up
cd "$ROOT_DIR"
rm -rf "$BUILD_DIR"

echo "Done! Created $ZIP_NAME without host_permissions."
