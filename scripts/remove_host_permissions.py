import json
import sys
import os

def remove_host_permissions(manifest_path):
    try:
        with open(manifest_path, 'r') as f:
            data = json.load(f)
        
        if 'host_permissions' in data:
            print(f"Removing host_permissions from {manifest_path}")
            del data['host_permissions']
            
            with open(manifest_path, 'w') as f:
                json.dump(data, f, indent=2)
        else:
            print(f"No host_permissions found in {manifest_path}")
            
    except Exception as e:
        print(f"Error processing {manifest_path}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python remove_host_permissions.py <path_to_manifest.json>")
        sys.exit(1)
    
    manifest_path = sys.argv[1]
    if not os.path.exists(manifest_path):
        print(f"File not found: {manifest_path}")
        sys.exit(1)
        
    remove_host_permissions(manifest_path)
