import pickle
import json
import sys
import os

# Path to the pickle file
pkl_path = 'old/rumor/.venv/lib/python3.9/site-packages/udar/resources/Sharoff_lem_freq_dict.pkl'
json_path = 'src/rltk/resources/models/Sharoff_lem_freq_dict.json'

try:
    with open(pkl_path, 'rb') as f:
        data = pickle.load(f)

    # Ensure the directory exists
    os.makedirs(os.path.dirname(json_path), exist_ok=True)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Successfully converted {pkl_path} to {json_path}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
