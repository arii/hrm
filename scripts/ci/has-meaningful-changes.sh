#!/bin/bash
set -e

# This script determines if a pull request contains meaningful code changes
# worth running the full pr-quality workflow for.
# It outputs a single line:
# has_changes=<true|false>

# Read environment variables passed from the workflow
BASE_SHA="${BASE_SHA}"
HEAD_SHA="${HEAD_SHA}"

# --- Argument validation ---
if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  echo "::error::Missing required BASE_SHA or HEAD_SHA environment variables."
  exit 1
fi

echo "::info::Comparing BASE:${BASE_SHA} and HEAD:${HEAD_SHA}"

# --- Get the list of changed files ---
if ! CHANGED_FILES=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" 2>/dev/null); then
    echo "::error::Failed to get diff between $BASE_SHA and $HEAD_SHA."
    echo "has_changes=true" >> "$GITHUB_OUTPUT"
    exit 0
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "::info::No file changes detected."
  echo "has_changes=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "::info::Files changed:"
echo "$CHANGED_FILES"

# --- Define patterns for files to ignore ---
IGNORE_PATTERNS=(
  '\.md$'
  '^.github/ISSUE_TEMPLATE/'
  '^.github/PULL_REQUEST_TEMPLATE.md$'
  '^docs/'
  '\.gitignore$'
  '\.prettierrc.json$'
  '\.png$'
  '\.svg$'
  '\.jpg$'
  '\.jpeg$'
  'pnpm-lock\.yaml$'
  '^.nvmrc$'
  '^LICENSE$'
)

SIGNIFICANT_FILES=$(echo "$CHANGED_FILES" | grep -vE "$(IFS=\| ; echo "${IGNORE_PATTERNS[*]}")")

if [ -z "$SIGNIFICANT_FILES" ]; then
  echo "::info::No meaningful code changes detected. All changes were in ignored files."
  echo "::info::Ignored files changed:"
  echo "$CHANGED_FILES"
  echo "has_changes=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

# --- Check for content-level changes (whitespace, comments) ---
# -w ignores all whitespace changes.
# If this diff is empty, it means all changes were whitespace-only.
if ! git diff -w --quiet "$BASE_SHA" "$HEAD_SHA" -- $SIGNIFICANT_FILES; then
  # There are non-whitespace changes, now check if they are only comments.
  # We get the diff, remove comments, and see if anything is left.
  # This regex is not perfect but covers common comment styles: //, #, /* ... */
  # It removes lines that are only comments or lines where a comment starts.
  # The grep removes lines starting with +, -, @@, diff, index, ---, +++
  DIFF_CONTENT=$(git diff -U0 "$BASE_SHA" "$HEAD_SHA" -- $SIGNIFICANT_FILES | \
    grep -E '^[+-]' | \
    grep -vE '^(--- a/|\+\+\+ b/|diff --git|index)')

  # Remove comment-only lines from the diff content
  # This regex is designed to match lines that are *only* comments.
  # It looks for lines starting with + or - followed by whitespace and then a comment marker.
  # It's not perfect but covers common cases for JS, Python, shell, etc.
  NON_COMMENT_CHANGES=$(echo "$DIFF_CONTENT" | grep -vE '^[+-]\s*(\/\/|#|\/\*|\*|\*\/)')

  if [ -z "$NON_COMMENT_CHANGES" ]; then
    echo "::info::No meaningful code changes detected. All changes were comments."
    echo "has_changes=false" >> "$GITHUB_OUTPUT"
    exit 0
  fi
else
    echo "::info::No meaningful code changes detected. All changes were whitespace-only."
    echo "has_changes=false" >> "$GITHUB_OUTPUT"
    exit 0
fi

echo "::info::Meaningful code changes detected. Proceeding with CI."
echo "::info::Significant files changed:"
echo "$SIGNIFICANT_FILES"
echo "has_changes=true" >> "$GITHUB_OUTPUT"
