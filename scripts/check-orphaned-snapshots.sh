#!/bin/bash
# scripts/check-orphaned-snapshots.sh
set -e

echo "🔍 Checking for orphaned snapshot directories..."

ORPHANS_FOUND=0

# Ensure we are in the repo root
cd "$(dirname "$0")/.."

for dir in tests/playwright/*-snapshots; do
  # Skip if no directories match the pattern
  [ -e "$dir" ] || continue

  # Remove trailing slash and -snapshots suffix to get expected test file base name
  # dir is tests/playwright/vrt-dashboard.spec.ts-snapshots
  base_name="${dir%-snapshots}"
  test_file="${base_name}"

  if [ ! -f "$test_file" ]; then
    echo "❌ ERROR: Orphaned snapshot directory found: $dir"
    echo "   (Expected test file $test_file does not exist)"
    ORPHANS_FOUND=1
  fi
done

if [ $ORPHANS_FOUND -eq 1 ]; then
  exit 1
else
  echo "✅ No orphaned snapshot directories found."
fi
