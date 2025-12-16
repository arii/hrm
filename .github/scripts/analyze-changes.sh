#!/bin/bash
set -e

# This script analyzes the significance of changes in a pull request to determine
# if a re-review is necessary. It is designed to be called from a GitHub Actions workflow.

# Input environment variables:
# - GITHUB_EVENT_AFTER
# - PULL_REQUEST_HEAD_SHA
# - GITHUB_EVENT_BEFORE
# - PULL_REQUEST_BASE_SHA
# - GITHUB_ENV

# Get the last commit that triggered this workflow
LAST_COMMIT=${GITHUB_EVENT_AFTER:-$PULL_REQUEST_HEAD_SHA}

# Determine PREVIOUS_COMMIT safely
PREVIOUS_COMMIT=""
# For 'synchronize' events on a PR, github.event.before contains the SHA of the commit
# *before* the new commits were pushed. If the user rebased their branch, this 'before'
# SHA can become invalid and no longer part of the branch's history.
if git rev-parse --verify ${GITHUB_EVENT_BEFORE}^{commit} >/dev/null 2>&1; then
    # If the 'before' commit is valid, use it to get the diff of just the new commits.
    PREVIOUS_COMMIT=${GITHUB_EVENT_BEFORE}
else
    # If 'before' is invalid (due to a rebase) or it's the initial push,
    # fall back to the merge-base. This provides a diff of all changes in
    # the PR against the target branch, which is a safe and robust fallback.
    PREVIOUS_COMMIT=$(git merge-base ${PULL_REQUEST_HEAD_SHA} ${PULL_REQUEST_BASE_SHA})
fi

# Write the determined PREVIOUS_COMMIT to the environment file for testing purposes
echo "PREVIOUS_COMMIT=$PREVIOUS_COMMIT" >> $GITHUB_ENV

# Check if this is just a merge commit
IS_MERGE=$(git log -1 --pretty=%P $LAST_COMMIT | wc -w)

# Get files changed in this push
# Note: This command can fail if PREVIOUS_COMMIT and LAST_COMMIT are the same.
# We'll add a check to handle this.
if [ "$PREVIOUS_COMMIT" == "$LAST_COMMIT" ]; then
  CHANGED_FILES=""
else
  CHANGED_FILES=$(git diff --name-only $PREVIOUS_COMMIT $LAST_COMMIT)
fi


# Count significant changes (exclude trivial files)
SIGNIFICANT_CHANGES=$(echo "$CHANGED_FILES" | \
  grep -v -E '\.(md|txt|json|yaml|yml)$' | \
  grep -v -E 'package-lock.json|pnpm-lock.yaml' | \
  wc -l)

# Write outputs to the GitHub environment file
echo "IS_MERGE=$IS_MERGE" >> $GITHUB_ENV
echo "SIGNIFICANT_CHANGES=$SIGNIFICANT_CHANGES" >> $GITHUB_ENV
echo "CHANGED_FILES<<EOF" >> $GITHUB_ENV
echo "$CHANGED_FILES" >> $GITHUB_ENV
echo "EOF" >> $GITHUB_ENV

# Get commit message
COMMIT_MSG=$(git log -1 --pretty=%B $LAST_COMMIT)
echo "COMMIT_MSG<<EOF" >> $GITHUB_ENV
echo "$COMMIT_MSG" >> $GITHUB_ENV
echo "EOF" >> $GITHUB_ENV
