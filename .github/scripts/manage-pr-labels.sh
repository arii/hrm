#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # Return value of a pipeline is the value of the last command to exit with a non-zero status

# Logging functions
# To enable debug logging (using the debug() function), set the DEBUG environment variable to "true".
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
# Get all existing labels once to avoid redundant API calls.
# We strip quotes and carriage returns to ensure reliable matching regardless of gh version or environment.
EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name' | tr -d '"\r')
jq -r '.[] | .name + "|" + .description + "|" + .color' .github/pr-labels.json | while IFS='|' read -r name description color; do
  # Trim whitespace just in case
  clean_name=$(echo "$name" | xargs)
  # GitHub labels are case-insensitive, so we use grep -i for the check.
  if echo "$EXISTING_LABELS" | grep -iFxq -- "$clean_name"; then
    debug "Label '$clean_name' already exists."
  else
    log "Creating label '$clean_name'..."
    # We use a subshell to capture errors and check for "already exists" specifically,
    # providing a safety net if the existence check missed a label (e.g. due to race conditions).
    set +e
    ERROR_MSG=$(gh label create "$clean_name" --description "$description" --color "$color" 2>&1)
    EXIT_CODE=$?
    set -e
    if [ $EXIT_CODE -ne 0 ] && ! echo "$ERROR_MSG" | grep -qi "already exists"; then
      error "Failed to create label '$clean_name': $ERROR_MSG"
    fi
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
  # Refresh existing labels to include any created in the first step.
  EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name' | tr -d '"\r')
  for label in "${LABELS[@]}"; do
    # Trim leading/trailing whitespace
    clean_label=$(echo "$label" | xargs)
    if [ -n "$clean_label" ]; then
      # GitHub labels are case-insensitive, so we use grep -i for the check.
      if echo "$EXISTING_LABELS" | grep -iFxq -- "$clean_label"; then
        debug "Label '$clean_label' already exists."
      else
        log "Creating label '$clean_label'..."
        set +e
        ERROR_MSG=$(gh label create "$clean_label" 2>&1)
        EXIT_CODE=$?
        set -e
        if [ $EXIT_CODE -ne 0 ] && ! echo "$ERROR_MSG" | grep -qi "already exists"; then
          error "Failed to create label '$clean_label': $ERROR_MSG"
        fi
      fi
    fi
  done
  endgroup

  log "Adding labels: $NEW_LABELS"
  gh pr edit $PR_NUMBER --add-label "$NEW_LABELS"
fi
