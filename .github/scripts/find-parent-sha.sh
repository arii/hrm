#!/bin/bash
set -e

BRANCH_NAME="$1"
CURRENT_RUN_ID="$2"
FALLBACK_SHA="$3"

if [ -z "$BRANCH_NAME" ] || [ -z "$CURRENT_RUN_ID" ]; then
  echo "Usage: $0 <branch_name> <current_run_id> [fallback_sha]" >&2
  exit 1
fi

echo "🔎 Searching for the last successful 'PR Quality Gate' workflow run on branch '$BRANCH_NAME'..." >&2

WORKFLOW_RUN_JSON=$(gh run list --workflow "pr-quality.yml" --branch "$BRANCH_NAME" --status completed -L 20 --json headSha,databaseId,status,conclusion)
PARENT_SHA=$(echo "$WORKFLOW_RUN_JSON" | jq -r --argjson current_run_id "$CURRENT_RUN_ID" '.[] | select(.databaseId != $current_run_id and .status == "completed" and .conclusion == "success") | .headSha' | head -n 1)

if [ -z "$PARENT_SHA" ]; then
  echo "::warning::Could not find a recent successful workflow run to copy checks from. Falling back to the commit before HEAD ($FALLBACK_SHA)." >&2
  PARENT_SHA="$FALLBACK_SHA"
fi

if [ -z "$PARENT_SHA" ] || [ "$PARENT_SHA" = "0000000000000000000000000000000000000000" ]; then
  echo "::warning::No valid previous commit SHA found. Falling back to HEAD~1." >&2
  PARENT_SHA=$(git rev-parse HEAD~1)
fi

echo "$PARENT_SHA"
