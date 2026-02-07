#!/bin/bash
# .github/scripts/analyze-slop.sh
set -o pipefail

BASE_SHA="$1"
HEAD_SHA="$2"
SCRIPT_PATH="./scripts/find_slop.sh"

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  echo "Usage: $0 <base_sha> <head_sha>" >&2
  exit 1
fi

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "❌ ERROR: Slop detector script not found at $SCRIPT_PATH."
  exit 0
fi

if [ ! -x "$SCRIPT_PATH" ]; then
  chmod +x "$SCRIPT_PATH"
fi

FILE_LIST=$(mktemp)
TEMP_OUT=$(mktemp)
trap 'rm -f "$FILE_LIST" "$TEMP_OUT"' EXIT

# Generate list of changed files
if ! git diff --name-only -z "${BASE_SHA}...${HEAD_SHA}" > "$FILE_LIST" 2>/dev/null; then
  echo "❌ ERROR: Failed to generate a list of changed files. This can happen in shallow clone environments."
  exit 0
fi

if [ ! -s "$FILE_LIST" ]; then
  echo "No analysis performed as no files were changed."
  exit 0
fi

# Run script on changed files
EXIT_CODE=0
xargs -0 "$SCRIPT_PATH" < "$FILE_LIST" > "$TEMP_OUT" 2>&1 || EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Success, no slop found.
  cat "$TEMP_OUT"
elif [ $EXIT_CODE -eq 1 ] || [ $EXIT_CODE -eq 123 ]; then
  # Slop was found, expected failure.
  cat "$TEMP_OUT"
else
  # Unexpected error
  echo "❌ ERROR: Slop detector script failed with unexpected exit code $EXIT_CODE."
  echo ""
  cat "$TEMP_OUT"
fi

exit 0
