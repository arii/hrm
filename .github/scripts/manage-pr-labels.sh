#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # Return value of a pipeline is the value of the last command to exit with a non-zero status
set -x # Print commands and their arguments as they are executed.

if [ -z "$GH_TOKEN" ] || [ -z "$PR_NUMBER" ]; then
  echo "Error: GH_TOKEN and PR_NUMBER environment variables are required."
  exit 1
fi

echo "Ensuring all managed labels exist..."
jq -r '.[] | .name + "|" + .description + "|" + .color' .github/pr-labels.json | while IFS='|' read -r name description color; do
  gh label create "$name" --description "$description" --color "$color" || true
done
echo "Label check complete."

if [ -f "review_result.json" ] && [ "$(jq 'has("labels")' review_result.json)" == "true" ]; then
  NEW_LABELS=$(jq -r '.labels | .[]' review_result.json | tr '\n' ',' | sed 's/,$//')
else
  echo "::warning::review_result.json not found or is missing the 'labels' key. Skipping label management."
  exit 0
fi

MANAGED_LABELS=$(jq -r '.[].name' .github/pr-labels.json)
CURRENT_LABELS=$(gh pr view $PR_NUMBER --json labels --jq '.labels[].name')

echo "Current labels on PR #$PR_NUMBER:"
echo "$CURRENT_LABELS"
echo "---"
echo "All managed labels (from .github/pr-labels.json):"
echo "$MANAGED_LABELS"
echo "---"
echo "New labels to apply from Gemini review:"
echo "$NEW_LABELS"
echo "---"

echo "Cleaning up automated review and obsolete labels..."
GH_TOKEN="$GH_TOKEN" ./scripts/ci/cleanup-pr-labels.sh "$PR_NUMBER" review

if [ -n "$NEW_LABELS" ]; then
  echo "Ensuring new labels exist before applying..."
  IFS=',' read -ra LABELS <<< "$NEW_LABELS"
  for label in "${LABELS[@]}"; do
    clean_label=$(echo "$label" | xargs)
    if [ -n "$clean_label" ]; then
      gh label create "$clean_label" || true
    fi
  done
  echo "Label check complete."

  echo "Adding labels: $NEW_LABELS"
  for label in "${LABELS[@]}"; do
    clean_label=$(echo "$label" | xargs)
    if [ -n "$clean_label" ]; then
      echo "Applying label: $clean_label"
      gh pr edit "$PR_NUMBER" --add-label "$clean_label" || echo "::warning::Failed to apply label: $clean_label"
    fi
  done
fi
