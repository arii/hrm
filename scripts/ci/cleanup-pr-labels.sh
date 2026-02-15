#!/bin/bash
# scripts/ci/cleanup-pr-labels.sh
# Universal script to remove automated and obsolete labels from a PR.

set -e

PR_NUMBER=$1

if [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <pr-number>"
  exit 1
fi

CONFIG_FILE=".github/automated-labels.yml"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file $CONFIG_FILE not found."
  exit 1
fi

# Get current labels on PR
echo "Fetching current labels for PR #$PR_NUMBER..."
CURRENT_LABELS=$(gh pr view "$PR_NUMBER" --json labels --jq '.labels[].name')

LABELS_TO_REMOVE=()

# 1. Check Review Labels
while IFS= read -r label; do
  if [ -n "$label" ] && echo "$CURRENT_LABELS" | grep -qx "$label"; then
    LABELS_TO_REMOVE+=("$label")
  fi
done < <(yq -r '.review[]' "$CONFIG_FILE")

# 2. Check Obsolete Labels
while IFS= read -r label; do
  if [ -n "$label" ] && echo "$CURRENT_LABELS" | grep -qx "$label"; then
    LABELS_TO_REMOVE+=("$label")
  fi
done < <(yq -r '.obsolete[]' "$CONFIG_FILE")

# 3. Check Scope Labels
SCOPE_PREFIX=$(yq -r '.scope_prefix' "$CONFIG_FILE")
while IFS= read -r label; do
  if [[ "$label" == "$SCOPE_PREFIX"* ]]; then
    LABELS_TO_REMOVE+=("$label")
  fi
done <<< "$CURRENT_LABELS"

# Deduplicate labels to remove
if [ ${#LABELS_TO_REMOVE[@]} -eq 0 ]; then
  echo "No managed or obsolete labels found on PR #$PR_NUMBER."
  exit 0
fi

# Use a temporary file to join with commas to handle spaces correctly
JOINED_LABELS=$(printf "%s\n" "${LABELS_TO_REMOVE[@]}" | sort -u | paste -sd "," -)

echo "Removing labels: $JOINED_LABELS"
gh pr edit "$PR_NUMBER" --remove-label "$JOINED_LABELS"
