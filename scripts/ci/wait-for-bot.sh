#!/bin/bash
# scripts/ci/wait-for-bot.sh
# Usage: ./wait-for-bot.sh <PR_NUMBER> <TYPE> <EXPECTED_VALUE>
#
# Types:
#   commit_count: Waits for the PR branch to have a specific number of commits.
#                 Usage: ./wait-for-bot.sh 123 commit_count 1
#
#   comment:      Waits for a comment body to contain the expected string.
#                 Usage: ./wait-for-bot.sh 123 comment "Successfully resolved"

set -e

PR_NUMBER=$1
CHECK_TYPE=$2
TARGET_VALUE=$3

if [ -z "$PR_NUMBER" ] || [ -z "$CHECK_TYPE" ] || [ -z "$TARGET_VALUE" ]; then
  echo "Usage: $0 <PR_NUMBER> <TYPE> <TARGET_VALUE>"
  echo "Types: commit_count, comment"
  exit 1
fi

TIMEOUT=300 # 5 minutes
INTERVAL=10
START_TIME=$(date +%s)

echo "Waiting for bot action..."
echo "PR: $PR_NUMBER"
echo "Type: $CHECK_TYPE"
echo "Target: '$TARGET_VALUE'"

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ "$ELAPSED" -gt "$TIMEOUT" ]; then
    echo "❌ Timeout waiting for bot action after ${ELAPSED}s."
    exit 1
  fi

  # Fetch comments to check for failures (and success if type is comment)
  COMMENTS=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[].body')

  # Check for known failure patterns
  if echo "$COMMENTS" | grep -q "❌ Automatic squash and rebase failed"; then
    echo "❌ Bot reported failure: Automatic squash and rebase failed."
    exit 1
  fi

  if echo "$COMMENTS" | grep -q "❌ \*\*Error: Unable to automatically resolve all conflicts.\*\*"; then
    echo "❌ Bot reported failure: Unable to resolve conflicts."
    exit 1
  fi

  if [ "$CHECK_TYPE" == "commit_count" ]; then
    # count commits in the PR
    COUNT=$(gh pr view "$PR_NUMBER" --json commits --jq '.commits | length')

    # Check if target is reached
    if [ "$COUNT" -eq "$TARGET_VALUE" ]; then
      echo "✅ Commit count reached $TARGET_VALUE."
      exit 0
    fi

    echo "⏳ Waiting... Current commit count: $COUNT (Target: $TARGET_VALUE)"

  elif [ "$CHECK_TYPE" == "comment" ]; then
    if echo "$COMMENTS" | grep -q "$TARGET_VALUE"; then
      echo "✅ Found comment: '$TARGET_VALUE'"
      exit 0
    fi

    echo "⏳ Waiting... Comment '$TARGET_VALUE' not found yet."
  else
    echo "Unknown check type: $CHECK_TYPE"
    exit 1
  fi

  sleep "$INTERVAL"
done
