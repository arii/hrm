#!/usr/bin/env bash
set -e

# 1. Identify current state
CURRENT_SHA=$(git rev-parse HEAD)
# Use environment variable if provided, else default to origin/leader
BASE_BRANCH=${BASE_BRANCH:-"origin/leader"}

# 2. Check for changes in the PR relative to the target branch (leader)
# Triple-dot (...) finds the diff from the common ancestor to HEAD
echo "::notice::Comparing HEAD against $BASE_BRANCH common ancestor..."
CHANGES=$(git diff --name-only "$BASE_BRANCH...$CURRENT_SHA")

if [ -n "$CHANGES" ]; then
    echo "::notice::File changes detected in this Pull Request."
    echo "has_changes=true" >> "$GITHUB_OUTPUT"
    echo "last_non_empty_commit=$CURRENT_SHA" >> "$GITHUB_OUTPUT"
else
    echo "::notice::No changes detected relative to leader. Searching history..."
    echo "has_changes=false" >> "$GITHUB_OUTPUT"

    # Fallback: Last commit that actually modified files
    LAST_NON_EMPTY=$(git log -n 1 --pretty=format:%H --diff-filter=ACMRT)
    echo "last_non_empty_commit=$LAST_NON_EMPTY" >> "$GITHUB_OUTPUT"
fi
