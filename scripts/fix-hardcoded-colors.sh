#!/bin/bash

# Fix hard-coded colors in Vue files
# This script replaces common hard-coded color values with CSS variables

echo "🔍 Finding hard-coded colors in playground demos..."

# Common color replacements
declare -A colors=(
  ["#667eea"]="var(--primary)"
  ["#5568d3"]="var(--primary-hover)"
  ["#4c5bc9"]="var(--primary-active)"
  ["#818cf8"]="var(--primary-light)"
  ["#10b981"]="var(--success)"
  ["#059669"]="var(--success-hover)"
  ["#047857"]="var(--success-active)"
  ["#34d399"]="var(--success-light)"
  ["#ef4444"]="var(--danger)"
  ["#dc2626"]="var(--danger-hover)"
  ["#b91c1c"]="var(--danger-active)"
  ["#f87171"]="var(--danger-light)"
  ["#f59e0b"]="var(--warning)"
  ["#d97706"]="var(--warning-hover)"
  ["#3b82f6"]="var(--info)"
  ["#2563eb"]="var(--info-hover)"
  ["#6b7280"]="var(--text-secondary)"
  ["#94a3b8"]="var(--text-muted)"
  ["#0f172a"]="var(--text-primary)"
  ["#e5e7eb"]="var(--border-color)"
  ["#f9fafb"]="var(--surface-50)"
  ["#f3f4f6"]="var(--surface-100)"
  ["#ffffff"]="var(--surface-0)"
  ["white"]="var(--surface-0)"
  ["#000000"]="var(--surface-900)"
  ["black"]="var(--surface-900)"
  ["#1e1e1e"]="var(--surface-section)"
  ["#d4d4d4"]="var(--text-secondary)"
  ["#eff6ff"]="var(--surface-ground)"
)

# Counter for changes
total_changes=0

for file in playground/demos/*.vue playground/components/*.vue; do
  if [ -f "$file" ]; then
    echo "📄 Processing: $(basename $file)"
    file_changes=0

    # Create backup
    cp "$file" "${file}.backup"

    for hex in "${!colors[@]}"; do
      variable="${colors[$hex]}"

      # Count occurrences before replacement
      count=$(grep -oiF "$hex" "$file" | wc -l)

      if [ $count -gt 0 ]; then
        # Replace in file (case insensitive)
        sed -i "s/${hex}/${variable}/gi" "$file"
        file_changes=$((file_changes + count))
        echo "  ✓ Replaced $count instances of $hex → $variable"
      fi
    done

    if [ $file_changes -gt 0 ]; then
      echo "  ✅ Total changes in file: $file_changes"
      total_changes=$((total_changes + file_changes))
    else
      echo "  ℹ️  No changes needed"
      # Remove backup if no changes
      rm "${file}.backup"
    fi
  fi
done

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Color replacement complete!"
echo "📊 Total replacements: $total_changes"
echo "⚠️  Manual review required for:"
echo "   - Complex color calculations (rgba, darken, lighten)"
echo "   - Gradient definitions"
echo "   - Box shadows with colors"
echo "   - Backup files created: *.backup"
echo "═══════════════════════════════════════════"
