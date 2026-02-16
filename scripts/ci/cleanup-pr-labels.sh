#!/bin/bash
# scripts/ci/cleanup-pr-labels.sh
# This script is used by automated PR workflows to ensure label consistency.
# Universal script to remove automated and obsolete labels from a PR.
# Usage: ./cleanup-pr-labels.sh <pr-number> [category]
# category: all (default), review, scope

set -e

PR_NUMBER=$1
CATEGORY=${2:-all}

if [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <pr-number> [category]"
  exit 1
fi

CONFIG_FILE=".github/automated-labels.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file $CONFIG_FILE not found."
  exit 1
fi

# Get current labels on PR
echo "Fetching current labels for PR #$PR_NUMBER..."
CURRENT_LABELS=$(gh pr view "$PR_NUMBER" --json labels --jq '.labels[].name')

LABELS_TO_REMOVE=()

# 1. ALWAYS Check Obsolete Labels
echo "Checking for obsolete labels..."
while IFS= read -r label; do
  if [ -n "$label" ] && echo "$CURRENT_LABELS" | grep -Fxq "$label"; then
    LABELS_TO_REMOVE+=("$label")
  fi
done < <(jq -r '.obsolete[]' "$CONFIG_FILE")

# 2. Check Review Labels
if [[ "$CATEGORY" == "all" || "$CATEGORY" == "review" ]]; then
  echo "Checking for review labels..."
  while IFS= read -r label; do
    if [ -n "$label" ] && echo "$CURRENT_LABELS" | grep -Fxq "$label"; then
      LABELS_TO_REMOVE+=("$label")
    fi
  done < <(jq -r '.review[]' "$CONFIG_FILE")
fi

# 3. Check Scope Labels
if [[ "$CATEGORY" == "all" || "$CATEGORY" == "scope" ]]; then
  echo "Checking for scope labels..."
  SCOPE_PREFIX=$(jq -r '.scope_prefix' "$CONFIG_FILE")
  while IFS= read -r label; do
    if [[ "$label" == "$SCOPE_PREFIX"* ]]; then
      LABELS_TO_REMOVE+=("$label")
    fi
  done <<< "$CURRENT_LABELS"
fi

# Deduplicate labels to remove
if [ ${#LABELS_TO_REMOVE[@]} -eq 0 ]; then
  echo "No labels to remove for category '$CATEGORY' on PR #$PR_NUMBER."
  exit 0
fi

# Join with commas
JOINED_LABELS=$(printf "%s\n" "${LABELS_TO_REMOVE[@]}" | sort -u | paste -sd "," -)

echo "Removing labels: $JOINED_LABELS"
gh pr edit "$PR_NUMBER" --remove-label "$JOINED_LABELS"
