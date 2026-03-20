#!/usr/bin/env python3
"""Filter out excluded drill categories from drills.json"""

import json

# Load drills
with open('/home/ubuntu/usab-drills-directory/client/src/data/drills.json', 'r') as f:
    drills = json.load(f)

# Categories to exclude
excluded_categories = {
    'Catching',
    'Team Skill Development',
    'Base Running',
    'Batting Practice'
}

# Filter drills
original_count = len(drills)
filtered_drills = [
    drill for drill in drills
    if not any(cat in excluded_categories for cat in drill.get('categories', []))
]
final_count = len(filtered_drills)

print(f"Original drill count: {original_count}")
print(f"Drills removed: {original_count - final_count}")
print(f"Final drill count: {final_count}")

# Save filtered drills
with open('/home/ubuntu/usab-drills-directory/client/src/data/drills.json', 'w') as f:
    json.dump(filtered_drills, f, indent=2)

print("✅ Drills filtered successfully!")
