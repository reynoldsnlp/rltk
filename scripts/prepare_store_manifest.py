"""Turn the local-dev manifest into the Chrome Web Store build manifest.

Applied:
  - remove host_permissions : localhost permissions used only in local development.
  - remove key              : pins the *unpacked* dev build's extension ID (so it
                              can be listed alongside the store ID in
                              docs/web/config.js). The store assigns its own ID,
                              and uploading a mismatched key is rejected, so it
                              must not ship in the store build.
  - swap dev icons          : the dev build uses dark-red RLTK-dev-*.png icons so
                              it's visually distinct when installed next to the
                              store build; the store build uses the real RLTK-*.png
                              (see scripts/make_dev_icons.py).
  - drop "DEV " name prefix : the dev build is named "DEV Russian Language ToolKit
                              (RLTK)" to tell it apart in the toolbar; the store
                              build uses the plain name.
"""
import json
import sys
import os

STRIP_KEYS = ("host_permissions", "key")
DEV_ICON_MARKER = "RLTK-dev-"
STORE_ICON_MARKER = "RLTK-"
DEV_NAME_PREFIX = "DEV "


def _restore_icons(value):
    """Recursively replace dev icon paths with the real ones in any string."""
    if isinstance(value, str):
        return value.replace(DEV_ICON_MARKER, STORE_ICON_MARKER)
    if isinstance(value, list):
        return [_restore_icons(v) for v in value]
    if isinstance(value, dict):
        return {k: _restore_icons(v) for k, v in value.items()}
    return value


def prepare_store_manifest(manifest_path):
    try:
        with open(manifest_path, "r") as f:
            data = json.load(f)

        for k in STRIP_KEYS:
            if k in data:
                print(f"Removing {k} from {manifest_path}")
                del data[k]
            else:
                print(f"No {k} found in {manifest_path}")

        if json.dumps(data).find(DEV_ICON_MARKER) != -1:
            print(f"Restoring store icons ({DEV_ICON_MARKER}* -> {STORE_ICON_MARKER}*)")
            data = _restore_icons(data)

        if isinstance(data.get("name"), str) and data["name"].startswith(DEV_NAME_PREFIX):
            data["name"] = data["name"][len(DEV_NAME_PREFIX):]
            print(f"Dropped \"{DEV_NAME_PREFIX.strip()}\" name prefix -> {data['name']!r}")

        with open(manifest_path, "w") as f:
            json.dump(data, f, indent=2)

    except Exception as e:
        print(f"Error processing {manifest_path}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python prepare_store_manifest.py <path_to_manifest.json>")
        sys.exit(1)

    manifest_path = sys.argv[1]
    if not os.path.exists(manifest_path):
        print(f"File not found: {manifest_path}")
        sys.exit(1)

    prepare_store_manifest(manifest_path)
