#!/bin/bash
set -e

# Define paths
ROOT_DIR=$(pwd)
BUILD_DIR="build_tmp"
MANIFEST_PATH="$BUILD_DIR/src/manifest.json"

# Embed the manifest version in the zip name (e.g. rltk-0.0.0.10.zip).
VERSION=$(python3 -c "import json; print(json.load(open('src/manifest.json'))['version'])")
ZIP_NAME="rltk-${VERSION}.zip"

# Clean up previous build (including any older versioned zips and the legacy name).
rm -rf "$BUILD_DIR"
rm -f rltk.zip rltk-*.zip

# Check version against Chrome Web Store
echo "Checking version..."
python3 scripts/check_version.py
if [ $? -ne 0 ]; then
    echo "Version check failed. Aborting build."
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy src to build directory. Shared files in src/rltk are symlinks into
# docs/rltk (the website-canonical location); -L dereferences them so the zip
# contains real files rather than dangling relative symlinks.
echo "Copying src to $BUILD_DIR..."
cp -RL src "$BUILD_DIR/"

# Remove host_permissions
python3 scripts/remove_host_permissions.py "$MANIFEST_PATH"

# Zip
echo "Zipping..."
cd "$BUILD_DIR"
zip -r "$ROOT_DIR/$ZIP_NAME" src -x "src/rltk/resources/models/old/*" -x "*/.DS_Store"

# Clean up
cd "$ROOT_DIR"
rm -rf "$BUILD_DIR"

echo "Done! Created $ZIP_NAME without host_permissions."
