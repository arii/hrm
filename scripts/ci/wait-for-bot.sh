#!/bin/bash
# scripts/ci/wait-for-bot.sh
#
# Waits for a bot to push changes to a PR branch or post a success comment,
# then waits for GitHub checks to be registered for the new commit.
#
# Usage: ./scripts/ci/wait-for-bot.sh <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>

set -e

PR_NUMBER="$1"
BRANCH_NAME="$2"
INITIAL_SHA="$3"

if [ -z "$PR_NUMBER" ] || [ -z "$BRANCH_NAME" ] || [ -z "$INITIAL_SHA" ]; then
  echo "Usage: $0 <PR_NUMBER> <BRANCH_NAME> <INITIAL_SHA>"
  exit 1
fi

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
  # Using jq -r to handle potentially complex JSON output
  COMMENTS=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[].body' 2>/dev/null || echo "")
  if echo "$COMMENTS" | grep -qiE "successfully|success"; then
    echo "✅ Bot has commented success. Proceeding to watch checks."
    # Re-fetch SHA just in case it updated while we were checking comments
    CURRENT_SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH_NAME" | awk '{print $1}')
    break
  fi

  echo "Waiting for SHA change or success comment... ($RETRY_COUNT/$MAX_RETRIES)"
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 15
done

if [ -z "$CURRENT_SHA" ] || [ "$CURRENT_SHA" == "$INITIAL_SHA" ]; then
  echo "❌ Bot failed to push changes or comment success within timeout."
  exit 1
fi

# 4. Wait for checks to appear for the new commit.
# We add a mandatory 15s delay to allow GitHub's eventually consistent API to index the new push.
echo "Waiting 15s for GitHub API to index the new commit..."
sleep 15
echo "Waiting for checks to appear for SHA $CURRENT_SHA..."

MAX_CHECK_RETRIES=60
CHECK_RETRY=0
while [ $CHECK_RETRY -lt $MAX_CHECK_RETRIES ]; do
  # Filter checks by name to avoid being confused by older runs
  # We look for ANY status that indicates a check is present (pending, pass, fail, etc.)
  CHECKS_OUTPUT=$(gh pr checks "$PR_NUMBER" 2>/dev/null || echo "no checks reported")

  if echo "$CHECKS_OUTPUT" | grep -v "no checks reported" | grep -qiE "pending|pass|fail|progressing|waiting|success|failure"; then
    echo "✅ Checks have been registered."
    break
  fi

  echo "Still waiting for checks to be indexed... ($CHECK_RETRY/$MAX_CHECK_RETRIES)"
  CHECK_RETRY=$((CHECK_RETRY + 1))
  sleep 10
done

echo "✅ Bot update confirmed and checks are registered."
