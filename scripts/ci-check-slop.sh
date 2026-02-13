#!/bin/bash
set -e

# Default to leader branch if not provided
BASE_BRANCH=${1:-leader}

echo "Installing dependencies..."
pip install unidiff > /dev/null 2>&1 || echo "Warning: Failed to install unidiff. Diff analysis might fail."

echo "Generating diff..."

# Try to fetch the base branch tip to ensure we have a reference for diff generation
# limiting fetch depth to 1 for performance
git fetch origin "$BASE_BRANCH" --depth=1 > /dev/null 2>&1 || echo "Warning: Could not fetch base branch."

# Attempt 1: Try finding the common ancestor (requires some history)
if git diff origin/"$BASE_BRANCH"...HEAD > changes.diff 2>/dev/null; then
    echo "Diff generated using merge-base (ideal)."
# Attempt 2: If merge-base fails (shallow clone), diff directly against the tip of base
elif git diff origin/"$BASE_BRANCH" HEAD > changes.diff 2>/dev/null; then
    echo "Diff generated against tip of base branch (fallback)."
else
    echo "Warning: Failed to generate diff. Proceeding with full slop check."
    rm -f changes.diff
fi

SKIP_CHECK=false

if [ -f "changes.diff" ]; then
    echo "Analyzing changes with unidiff..."
    # Pass explicit exclusions for slop check
    if python3 scripts/check_diff.py changes.diff --exclude '*.lock' 'pnpm-lock.yaml' 'package-lock.json' 'yarn.lock' '*.svg' '*.png' '*.ico' '*.map' 'find_slop.sh'; then
        echo "Meaningful changes detected."
    else
        echo "✅ No meaningful changes detected (empty or excluded files only). Skipping slop check."
        SKIP_CHECK=true
    fi
else
    echo "Diff file missing. Proceeding with full slop check."
fi

if [ "$SKIP_CHECK" = "true" ]; then
    exit 0
fi

echo "Running full slop check..."
# Explicitly ignore the diff file we just created, although find_slop.sh now excludes it by default too.
rm -f changes.diff
pnpm run lint:slop
