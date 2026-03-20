"""
Remove non-hitting drill detail entries from DrillDetail.tsx.
These entries are in a Record<string, {...}> object.
We identify entries by their skillSet field and remove the entire entry block.
"""
import re

filepath = 'client/src/pages/DrillDetail.tsx'

with open(filepath) as f:
    content = f.read()

# Non-hitting drill slugs to remove
non_hitting_slugs = [
    "defense-stance",
    "1st-base-flip-to-pitcher",
    "2nd-baseman-forehand-spin",
    "advanced-batting-practice",
    "arm-path-drill",
    "30-second-backhand",
    "ball-in-the-sun",
    "1st-base-inside-receiving",
    "1st-base-off-bag",
    "30-second-backhand-cross",
    "30-second-crow-hops",
    "backhand-cross-and-throw",
    "box-drill-2nd-baseman-double-play-feeds",
    "fly-balls",
    "rapid-fire-fungo",
    "read-and-react",
    "short-base-team-bunt-drill",
    "stride-to-spot",
]

removed = 0
for slug in non_hitting_slugs:
    # Pattern to match the full entry: "slug": { ... },
    # We need to match from "slug": { to the closing }, 
    # Being careful about nested objects
    escaped_slug = re.escape(slug)
    # Match "slug": { ... }, where ... can contain nested braces
    pattern = rf'  "{escaped_slug}":\s*\{{[^}}]*\}},?\n'
    
    match = re.search(pattern, content)
    if match:
        content = content[:match.start()] + content[match.end():]
        removed += 1
        print(f"  Removed: {slug}")
    else:
        print(f"  NOT FOUND (trying multiline): {slug}")
        # Try multiline pattern for entries with arrays
        # Find the start
        start_pattern = rf'  "{escaped_slug}":\s*\{{'
        start_match = re.search(start_pattern, content)
        if start_match:
            # Find the matching closing brace
            start_pos = start_match.start()
            brace_count = 0
            end_pos = start_match.end()
            for i in range(start_match.end() - 1, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i + 1
                        break
            
            # Include trailing comma and newline
            while end_pos < len(content) and content[end_pos] in ',\n ':
                end_pos += 1
            
            content = content[:start_pos] + content[end_pos:]
            removed += 1
            print(f"  Removed (multiline): {slug}")
        else:
            print(f"  TRULY NOT FOUND: {slug}")

print(f"\nRemoved {removed} non-hitting drill detail entries")

# Verify no non-hitting skillSets remain
remaining = re.findall(r'skillSet:\s*"(Infield|Outfield|Pitching|Bunting|Catching|Base Running)"', content)
print(f"Remaining non-hitting skillSet references: {len(remaining)}")
if remaining:
    for r in remaining:
        print(f"  Still has: {r}")

with open(filepath, 'w') as f:
    f.write(content)

print("Done!")
