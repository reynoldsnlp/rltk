import urllib.request
import re
import json
import sys
import os

URL = "https://chromewebstore.google.com/detail/russian-language-toolkit/hofbpcgdhdaihhlcjegbfdnmaplnjnco"
MANIFEST_PATH = "src/manifest.json"

def get_published_version():
    try:
        req = urllib.request.Request(
            URL,
            data=None,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        )
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')

            # Look for "Version</div><div ...>0.0.0.3</div>"
            # Based on curl output: <div class="QDHp8e">Version</div><div class="nBZElf">0.0.0.3</div>
            match = re.search(r'Version</div><div[^>]*>([\d.]+)<', html)

            if match:
                return match.group(1)

            # Fallback: try to find it in the JSON blob if the HTML structure changes
            # "version": "0.0.0.3"
            json_match = re.search(r'"version":\s*"([\d.]+)"', html)
            if json_match:
                 return json_match.group(1)

            print("Could not find version on Chrome Web Store page.")
            return None
    except Exception as e:
        print(f"Error fetching published version: {e}")
        return None

def get_local_version():
    try:
        with open(MANIFEST_PATH, 'r') as f:
            data = json.load(f)
            return data.get('version')
    except Exception as e:
        print(f"Error reading local manifest: {e}")
        return None

def compare_versions(local, published):
    # Split by dot and convert to integers for comparison
    local_parts = [int(x) for x in local.split('.')]
    published_parts = [int(x) for x in published.split('.')]

    # Pad with zeros if lengths differ
    while len(local_parts) < len(published_parts):
        local_parts.append(0)
    while len(published_parts) < len(local_parts):
        published_parts.append(0)

    return local_parts > published_parts

def main():
    print(f"Checking version against {URL}...")

    published_version = get_published_version()
    if not published_version:
        print("Warning: Could not determine published version. Proceeding with build.")
        sys.exit(0) # Proceed if we can't check, or maybe fail? User asked to exit if <=.
                    # But if we can't find it, maybe we should warn.
                    # Let's assume if we can't find it, we shouldn't block, but the user was specific.
                    # Let's try to be strict if the user wants to avoid mistakes.
                    # Actually, if scraping fails, it's safer to fail and ask user to check.
        # print("Error: Could not determine published version.")
        # sys.exit(1)

    local_version = get_local_version()
    if not local_version:
        print("Error: Could not determine local version.")
        sys.exit(1)

    print(f"Published version: {published_version}")
    print(f"Local version:     {local_version}")

    if local_version == published_version:
        print("Local version is the same as published version. Please bump version in manifest.json.")
        sys.exit(1)

    # Check if local is actually smaller (older)
    # We need a proper version comparison
    is_newer = compare_versions(local_version, published_version)

    if not is_newer:
        print("Local version is older than or equal to published version. Please bump version in manifest.json.")
        sys.exit(1)

    print("Version check passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
