#!/bin/bash
# Check for hardcoded colors in Vue files

echo "🔍 Checking for hardcoded colors in playground demos..."
echo ""

# Find hardcoded colors (excluding var(--, viewBox, stroke-, comments, template strings)
RESULT=$(grep -r "rgba\|#[0-9a-fA-F]" playground --include="*.vue" --exclude-dir="node_modules" | \
  grep -v "var(--" | \
  grep -v "viewBox" | \
  grep -v "stroke-" | \
  grep -v "<!-" | \
  grep -v "template #" | \
  wc -l)

echo "Total hardcoded color instances found: $RESULT"
echo ""

if [ "$RESULT" -gt 0 ]; then
  echo "❌ FAILED: Found $RESULT hardcoded colors"
  echo ""
  echo "Top offenders:"
  grep -r "rgba\|#[0-9a-fA-F]" playground --include="*.vue" --exclude-dir="node_modules" | \
    grep -v "var(--" | \
    grep -v "viewBox" | \
    grep -v "stroke-" | \
    grep -v "<!-" | \
    grep -v "template #" | \
    cut -d: -f1 | \
    sort | \
    uniq -c | \
    sort -rn | \
    head -10
  exit 1
else
  echo "✅ PASSED: No hardcoded colors found!"
  exit 0
fi
