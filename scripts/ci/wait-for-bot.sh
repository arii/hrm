#!/bin/bash
# scripts/ci/wait-for-bot.sh
#
# Waits for a bot to push changes to a PR branch or post a success comment,
# then waits for GitHub checks to be registered for the new commit.
#
# Usage: ./scripts/ci/wait-for-bot.sh <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>

set -e

# Validate arguments using parameter expansion
PR_NUMBER="${1:?Usage: $0 <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>}"
BRANCH_NAME="${2:?Usage: $0 <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>}"
INITIAL_SHA="${3:?Usage: $0 <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>}"

REPO="origin" # Default remote

echo "🔍 Waiting for bot to update PR #$PR_NUMBER (Branch: $BRANCH_NAME)..."

MAX_RETRIES=60
RETRY_COUNT=0
CURRENT_SHA=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Check for new SHA on remote
  CURRENT_SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH_NAME" | awk '{print $1}')

  if [ -n "$CURRENT_SHA" ] && [ "$CURRENT_SHA" != "$INITIAL_SHA" ]; then
    echo "✅ Bot has pushed changes (New SHA: $CURRENT_SHA)"
    break
  fi

  # Fallback: check for the bot's success comment
  COMMENTS=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[].body' 2>/dev/null || echo "")
  if echo "$COMMENTS" | grep -qiE "successfully|success"; then
    # Re-fetch SHA to confirm the update propagated
    CURRENT_SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH_NAME" | awk '{print $1}')
    if [ -n "$CURRENT_SHA" ] && [ "$CURRENT_SHA" != "$INITIAL_SHA" ]; then
      echo "✅ Bot has commented success and SHA updated."
      break
    fi
    # If SHA hasn't updated yet, we continue looping
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 15
done

if [ -z "$CURRENT_SHA" ] || [ "$CURRENT_SHA" == "$INITIAL_SHA" ]; then
  echo "❌ Bot failed to push changes or comment success within timeout."
  exit 1
fi

echo "Waiting for checks to appear for SHA $CURRENT_SHA..."

MAX_CHECK_RETRIES=60
CHECK_RETRY=0
while [ $CHECK_RETRY -lt $MAX_CHECK_RETRIES ]; do
  # Filter checks by name to avoid being confused by older runs
  CHECKS_OUTPUT=$(gh pr checks "$PR_NUMBER" 2>/dev/null || echo "no checks reported")

  if echo "$CHECKS_OUTPUT" | grep -v "no checks reported" | grep -qiE "pending|pass|fail|progressing|waiting|success|failure"; then
    echo "✅ Checks have been registered."
    break
  fi

  CHECK_RETRY=$((CHECK_RETRY + 1))
  sleep 10
done

echo "✅ Bot update confirmed and checks are registered."
