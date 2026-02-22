#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # Return value of a pipeline is the value of the last command to exit with a non-zero status

# Logging functions
log() { echo "$*"; }
warn() { echo "::warning::$*"; }
error() { echo "::error::$*"; exit 1; }
debug() { if [ "$DEBUG" = "true" ]; then echo "::debug::$*"; fi; }
group() { echo "::group::$1"; }
endgroup() { echo "::endgroup::"; }

# Check for required environment variables
if [ -z "$GH_TOKEN" ] || [ -z "$PR_NUMBER" ]; then
  error "GH_TOKEN and PR_NUMBER environment variables are required."
fi

# =================================================================
# Ensure all managed labels exist in the repository
# =================================================================
group "Ensuring all managed labels exist"
EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name')
jq -r '.[] | .name + "|" + .description + "|" + .color' .github/pr-labels.json | while IFS='|' read -r name description color; do
  if echo "$EXISTING_LABELS" | grep -Fxq -- "$name"; then
    debug "Label '$name' already exists."
  else
    log "Creating label '$name'..."
    gh label create "$name" --description "$description" --color "$color" || true
  fi
done
endgroup

# =================================================================
# Proceed with label management on the PR
# =================================================================

# Extract new labels from the review result JSON
if [ -f "review_result.json" ] && [ "$(jq 'has("labels")' review_result.json)" == "true" ]; then
  NEW_LABELS=$(jq -r '.labels | .[]' review_result.json | tr '\n' ',' | sed 's/,$//')
else
  warn "review_result.json not found or is missing the 'labels' key. Skipping label management."
  exit 0
fi

# Get the list of managed labels from the pr-labels.json file
MANAGED_LABELS=$(jq -r '.[].name' .github/pr-labels.json)

# Get current labels on the PR
CURRENT_LABELS=$(gh pr view $PR_NUMBER --json labels --jq '.labels[].name')

group "Label Details for PR #$PR_NUMBER"
log "Current labels on PR:"
log "$CURRENT_LABELS"
log "---"
log "All managed labels (from .github/pr-labels.json):"
debug "$MANAGED_LABELS"
log "---"
log "New labels to apply from Gemini review:"
log "$NEW_LABELS"
endgroup

# Call the universal cleanup script to remove automated review and obsolete labels.
# This script is located at scripts/ci/cleanup-pr-labels.sh
group "Cleaning up automated review and obsolete labels"
GH_TOKEN="$GH_TOKEN" ./scripts/ci/cleanup-pr-labels.sh "$PR_NUMBER" review
endgroup

# Add the new labels from the Gemini review
if [ -n "$NEW_LABELS" ]; then
  # Before adding, ensure all new labels exist.
  group "Ensuring new labels exist before applying"
  IFS=',' read -ra LABELS <<< "$NEW_LABELS"
  # Refresh existing labels to include any created in the first step
  EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name')
  for label in "${LABELS[@]}"; do
    # Trim leading/trailing whitespace
    clean_label=$(echo "$label" | xargs)
    if [ -n "$clean_label" ]; then
      if echo "$EXISTING_LABELS" | grep -Fxq -- "$clean_label"; then
        debug "Label '$clean_label' already exists."
      else
        log "Creating label '$clean_label'..."
        gh label create "$clean_label" || true
      fi
    fi
  done
  endgroup

  log "Adding labels: $NEW_LABELS"
  gh pr edit $PR_NUMBER --add-label "$NEW_LABELS"
fi
