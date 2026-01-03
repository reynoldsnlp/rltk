import json
import sys

file_path = 'src/rltk/resources/models/lemmaToExemplarMap.json'
delimiter = 'ñôŃßĘńŠē'

print(f"Reading {file_path}...")
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)

inflection_to_html = {}
lemma_to_inflection = {}

print("Processing entries...")
for lemma, value in data.items():
    if delimiter not in value:
        print(f"Warning: Delimiter not found for lemma '{lemma}'. Skipping.")
        continue

    parts = value.split(delimiter)
    if len(parts) != 2:
        print(f"Warning: Unexpected format for lemma '{lemma}'. Skipping.")
        continue

    inflection_code = parts[0]
    html_snippet = parts[1]

    # Check for collisions in inflection_code -> html mapping
    if inflection_code in inflection_to_html:
        if inflection_to_html[inflection_code] != html_snippet:
            print(f"Error: Inflection code '{inflection_code}' maps to multiple different HTML snippets!")
            # We can append a suffix to make it unique if necessary, but let's see if it happens.
            # For now, let's just print the error and maybe exit or continue.
            # If this happens, the user's request "map inflection codes to HTML snippets" is ambiguous.
            # Let's assume it's 1:1 for now.
            pass
    else:
        inflection_to_html[inflection_code] = html_snippet

    lemma_to_inflection[lemma] = inflection_code

new_structure = {
    "inflection_to_html": inflection_to_html,
    "lemma_to_inflection": lemma_to_inflection
}

print(f"Writing restructured data to {file_path}...")
try:
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(new_structure, f, ensure_ascii=False, indent=2)
    print("Done.")
except Exception as e:
    print(f"Error writing file: {e}")
    sys.exit(1)
