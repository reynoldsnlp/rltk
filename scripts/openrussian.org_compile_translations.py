import csv
import json
import os
import re

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_FILE = os.path.join(BASE_DIR, 'src', 'resources', 'models', 'openrussian.org-words.csv')
TRANSLATIONS_FILE = os.path.join(BASE_DIR, 'src', 'resources', 'models', 'openrussian.org-translations.csv')
OUTPUT_FILE = os.path.join(BASE_DIR, 'src', 'resources', 'models', 'openrussian-translations-eng.json')

def normalize_lemma(lemma):
    if not lemma:
        return ""
    # Remove stress marks (combining acute accent)
    lemma = lemma.replace('\u0301', '')
    # Remove digits (superscript numbers often used for homonyms)
    lemma = re.sub(r'\d+', '', lemma)
    # Case folding
    lemma = lemma.lower()
    return lemma.strip()

def load_words(filepath):
    words = {}
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return words

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            word_id = row['id']
            words[word_id] = {
                'lemma': row['bare'],
                'type': row['type'],
                'audio': row['audio']
            }
    return words

def load_translations(filepath):
    translations = {}
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return translations

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            if row['lang'] == 'en':
                word_id = row['word_id']
                if word_id not in translations:
                    translations[word_id] = []
                translations[word_id].append(row['tl'])
    return translations

def generate_html(pos, audio_url, translations_list):
    html_parts = []

    # POS
    if pos:
        html_parts.append(f'<span class="rltk-pos">{pos}</span>')

    # Audio
    if audio_url:
        html_parts.append(f'<button class="rltk-audio-btn" data-audio-url="{audio_url}" title="Play audio">🔊</button>')

    # Translations
    if translations_list:
        trans_str = ", ".join(translations_list)
        html_parts.append(f'<span>{trans_str}</span>')

    return "".join(html_parts)

    return "".join(html_parts)

def main():
    print(f"Reading words from {WORDS_FILE}...")
    words = load_words(WORDS_FILE)

    print(f"Reading translations from {TRANSLATIONS_FILE}...")
    translations = load_translations(TRANSLATIONS_FILE)

    print("Compiling data...")
    lemma_to_html = {}

    # Group by lemma
    lemma_groups = {}
    for word_id, word_data in words.items():
        raw_lemma = word_data['lemma']
        if not raw_lemma:
            continue

        lemma = normalize_lemma(raw_lemma)

        if lemma not in lemma_groups:
            lemma_groups[lemma] = []
        lemma_groups[lemma].append(word_id)

    for lemma, word_ids in lemma_groups.items():
        # Collect all entries for this lemma
        entries = []
        for word_id in word_ids:
            word_data = words[word_id]
            word_trans = translations.get(word_id, [])

            # Only include if we have translations
            if not word_trans:
                continue

            # Filter out broken audio links from openrussian.org
            audio_url = word_data['audio']
            if audio_url and 'openrussian.org' in audio_url:
                audio_url = ''

            entries.append({
                'type': word_data['type'],
                'audio': audio_url,
                'translations': word_trans
            })

        if not entries:
            continue

        pos_map = {}
        seen_entries = set()

        for entry in entries:
            # Create a unique key for the entry to avoid exact duplicates
            # Sort translations to ensure order doesn't matter for duplication check
            entry_key = (entry['type'], entry['audio'], tuple(sorted(entry['translations'])))
            if entry_key in seen_entries:
                continue
            seen_entries.add(entry_key)

            html = generate_html(entry['type'], entry['audio'], entry['translations'])

            w_type = entry['type']
            if w_type not in pos_map:
                pos_map[w_type] = []
            pos_map[w_type].append(html)

        if pos_map:
            final_entry = {}
            for w_type, html_list in pos_map.items():
                final_entry[w_type] = '<span class="rltk-entry-separator">|</span>'.join(html_list)
            lemma_to_html[lemma] = final_entry

    print(f"Writing {len(lemma_to_html)} entries to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(lemma_to_html, f, ensure_ascii=False, sort_keys=True, indent=2)

if __name__ == "__main__":
    main()
