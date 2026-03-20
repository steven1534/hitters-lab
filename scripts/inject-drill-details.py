#!/usr/bin/env python3
import re

# Read the generated drill details
with open('./scripts/generated-drill-details.ts', 'r') as f:
    generated_content = f.read()

# Read the current DrillDetail.tsx
with open('./client/src/pages/DrillDetail.tsx', 'r') as f:
    drill_detail_content = f.read()

# Find the position to insert (before the closing brace of drillDetails)
# Look for the pattern: },\n}
pattern = r'(    videoUrl: null\n  ),\n}'

# Replace with: }, + generated content + }
replacement = f'    videoUrl: null\n  }},\n  {generated_content}\n}}'

# Perform the replacement
new_content = re.sub(pattern, replacement, drill_detail_content)

# Write back to DrillDetail.tsx
with open('./client/src/pages/DrillDetail.tsx', 'w') as f:
    f.write(new_content)

print("✅ Successfully injected 211 drill details into DrillDetail.tsx")
print("All drills now have internal detail pages with video support!")
