#!/bin/bash
set -e

# Default to leader branch if not provided
BASE_BRANCH=${1:-leader}

echo "Installing dependencies..."
pip install unidiff > /dev/null 2>&1 || echo "Warning: Failed to install unidiff. Diff analysis might fail."

echo "Generating diff..."
# specific to PR checks: find common ancestor or just diff against tip of base
git diff origin/"$BASE_BRANCH"...HEAD > changes.diff || {
    echo "Warning: Failed to generate diff. Proceeding with full slop check."
    rm -f changes.diff
}

SKIP_CHECK=false

if [ -f "changes.diff" ]; then
    echo "Analyzing changes with unidiff..."
    if python3 scripts/check_diff.py changes.diff; then
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
pnpm run lint:slop
