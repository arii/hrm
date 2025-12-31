#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # Return value of a pipeline is the value of the last command to exit with a non-zero status
set -x # Print commands and their arguments as they are executed.

# Check for required environment variables
if [ -z "$GH_TOKEN" ] || [ -z "$PR_NUMBER" ]; then
  echo "Error: GH_TOKEN and PR_NUMBER environment variables are required."
  exit 1
fi

# Extract new labels from the review result JSON
if [ -f "review_result.json" ] && [ "$(jq 'has("labels")' review_result.json)" == "true" ]; then
  NEW_LABELS=$(jq -r '.labels | .[]' review_result.json | tr '\n' ',' | sed 's/,$//')
else
  echo "::warning::review_result.json not found or is missing the 'labels' key. Skipping label management."
  exit 0
fi

# Get the list of managed labels from the pr-labels.yml file
MANAGED_LABELS=$(yq -r '.[].name' .github/pr-labels.yml)

# Get current labels on the PR
CURRENT_LABELS=$(gh pr view $PR_NUMBER --json labels --jq '.labels[].name')

echo "Current labels:\n$CURRENT_LABELS"
echo "Managed labels:\n$MANAGED_LABELS"
echo "New labels from review: $NEW_LABELS"

# Collect labels to remove into a single comma-separated string
LABELS_TO_REMOVE=""
for label in $MANAGED_LABELS; do
  if echo "$CURRENT_LABELS" | grep -q "^$label$"; then
    if [ -z "$LABELS_TO_REMOVE" ]; then
      LABELS_TO_REMOVE="$label"
    else
      LABELS_TO_REMOVE="$LABELS_TO_REMOVE,$label"
    fi
  fi
done

# Remove all managed labels from the PR in a single call
if [ -n "$LABELS_TO_REMOVE" ]; then
  echo "Removing labels: $LABELS_TO_REMOVE"
  gh pr edit $PR_NUMBER --remove-label "$LABELS_TO_REMOVE"
fi

# Add the new labels from the Gemini review
if [ -n "$NEW_LABELS" ]; then
  echo "Adding labels: $NEW_LABELS"
  gh pr edit $PR_NUMBER --add-label "$NEW_LABELS"
fi
