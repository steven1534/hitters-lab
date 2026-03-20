#!/bin/bash
# Coach Steve Baseball Rebrand Script
# Replaces blue/cyan/indigo brand colors with crimson red (#DC143C)
# Preserves functional/status colors (green active, difficulty badges, progress bars)

cd /home/ubuntu/usab-drills-directory/client/src

# ===== BACKGROUND REPLACEMENTS =====
# Replace dark navy backgrounds (#0f1225, #0a0f1e, #0f172a, #0a1628, #1a2744, #0d1117, #0a0e14) with charcoal
find . -name "*.tsx" -exec sed -i \
  -e 's/bg-\[#0f1225\]/bg-[#1a1a1a]/g' \
  -e 's/bg-\[#0a0f1e\]/bg-[#1a1a1a]/g' \
  -e 's/bg-\[#0a1628\]/bg-[#1a1a1a]/g' \
  -e 's/bg-\[#0a0e14\]/bg-[#1a1a1a]/g' \
  -e 's/bg-\[#0d1117\]/bg-[#1a1a1a]/g' \
  -e 's/from-\[#0a0f1e\]/from-[#1a1a1a]/g' \
  -e 's/to-\[#0f172a\]/to-[#2a2a2a]/g' \
  -e 's/from-\[#0a1628\]/from-[#1a1a1a]/g' \
  -e 's/to-\[#1a2744\]/to-[#2a2a2a]/g' \
  -e 's/from-\[#0a0e14\]/from-[#1a1a1a]/g' \
  {} +

# ===== BRAND ACCENT COLOR REPLACEMENTS =====
# blue-600 -> [#DC143C] (primary action buttons)
find . -name "*.tsx" -exec sed -i \
  -e 's/bg-blue-600/bg-[#DC143C]/g' \
  -e 's/hover:bg-blue-700/hover:bg-[#B91030]/g' \
  -e 's/hover:bg-blue-500/hover:bg-[#B91030]/g' \
  -e 's/active:bg-blue-700/active:bg-[#B91030]/g' \
  -e 's/shadow-blue-600\/20/shadow-[#DC143C]\/20/g' \
  -e 's/shadow-blue-600\/30/shadow-[#DC143C]\/30/g' \
  -e 's/shadow-blue-500\/30/shadow-[#DC143C]\/30/g' \
  -e 's/shadow-blue-500\/20/shadow-[#DC143C]\/20/g' \
  {} +

# blue-500 accent -> crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/text-blue-500/text-[#DC143C]/g' \
  -e 's/border-blue-500/border-[#DC143C]/g' \
  -e 's/bg-blue-500/bg-[#DC143C]/g' \
  -e 's/from-blue-500/from-[#DC143C]/g' \
  -e 's/to-blue-500/to-[#DC143C]/g' \
  -e 's/via-blue-500/via-[#DC143C]/g' \
  -e 's/to-blue-600/to-[#B91030]/g' \
  -e 's/from-blue-600/from-[#DC143C]/g' \
  {} +

# blue-400 text -> crimson lighter
find . -name "*.tsx" -exec sed -i \
  -e 's/text-blue-400/text-[#E8425A]/g' \
  -e 's/text-blue-300/text-[#E8425A]/g' \
  {} +

# blue-50/100/200 light mode backgrounds -> crimson tints
find . -name "*.tsx" -exec sed -i \
  -e 's/bg-blue-50/bg-red-50/g' \
  -e 's/bg-blue-100/bg-red-100/g' \
  -e 's/text-blue-800/text-red-800/g' \
  -e 's/text-blue-900/text-red-900/g' \
  -e 's/text-blue-700/text-red-700/g' \
  -e 's/text-blue-600/text-[#DC143C]/g' \
  -e 's/border-blue-200/border-red-200/g' \
  -e 's/border-blue-800/border-red-800/g' \
  -e 's/border-blue-900/border-red-900/g' \
  -e 's/hover:bg-blue-100/hover:bg-red-100/g' \
  {} +

# blue dark mode variants
find . -name "*.tsx" -exec sed -i \
  -e 's/dark:bg-blue-900/dark:bg-red-900/g' \
  -e 's/dark:bg-blue-950/dark:bg-red-950/g' \
  -e 's/dark:text-blue-100/dark:text-red-100/g' \
  -e 's/dark:text-blue-300/dark:text-red-300/g' \
  -e 's/dark:text-blue-400/dark:text-red-400/g' \
  -e 's/dark:border-blue-800/dark:border-red-800/g' \
  -e 's/dark:border-blue-900/dark:border-red-900/g' \
  {} +

# blue-600/20 opacity variants
find . -name "*.tsx" -exec sed -i \
  -e 's/bg-blue-600\/20/bg-[#DC143C]\/20/g' \
  -e 's/bg-blue-600\/10/bg-[#DC143C]\/10/g' \
  {} +

# cyan -> crimson (brand accent, not functional)
find . -name "*.tsx" -exec sed -i \
  -e 's/text-cyan-400/text-[#E8425A]/g' \
  -e 's/text-cyan-300/text-[#E8425A]/g' \
  -e 's/bg-cyan-500/bg-[#DC143C]/g' \
  -e 's/border-cyan-500/border-[#DC143C]/g' \
  -e 's/from-cyan-500/from-[#DC143C]/g' \
  -e 's/to-cyan-500/to-[#DC143C]/g' \
  -e 's/via-cyan-500/via-[#DC143C]/g' \
  -e 's/to-cyan-400/to-[#E8425A]/g' \
  -e 's/bg-cyan-400/bg-[#E8425A]/g' \
  {} +

# indigo -> crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/text-indigo-400/text-[#E8425A]/g' \
  -e 's/text-indigo-600/text-[#DC143C]/g' \
  -e 's/bg-indigo-50/bg-red-50/g' \
  -e 's/bg-indigo-950/bg-red-950/g' \
  -e 's/dark:bg-indigo-950/dark:bg-red-950/g' \
  {} +

# electric-blue references -> crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/from-electric-blue/from-[#DC143C]/g' \
  -e 's/to-electric-blue/to-[#DC143C]/g' \
  -e 's/text-electric-blue/text-[#DC143C]/g' \
  -e 's/bg-electric-blue/bg-[#DC143C]/g' \
  {} +

# sky references -> crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/text-sky-400/text-[#E8425A]/g' \
  -e 's/bg-sky-500/bg-[#DC143C]/g' \
  {} +

# ring-blue -> ring-crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/ring-blue-500/ring-[#DC143C]/g' \
  -e 's/focus:ring-blue-500/focus:ring-[#DC143C]/g' \
  -e 's/focus:border-blue-500/focus:border-[#DC143C]/g' \
  {} +

# violet references in blast metrics -> crimson
find . -name "*.tsx" -exec sed -i \
  -e 's/to-violet-500/to-[#DC143C]/g' \
  -e 's/from-violet-500/from-[#DC143C]/g' \
  {} +

# Hex color #06b6d4 (cyan-500 hex) -> #DC143C
find . -name "*.tsx" -exec sed -i \
  -e 's/#06b6d4/#DC143C/g' \
  -e 's/#3b82f6/#DC143C/g' \
  {} +

echo "Rebrand complete! All blue/cyan/indigo brand colors replaced with crimson red."
echo "Functional colors (green active, difficulty badges, progress bars) preserved."
