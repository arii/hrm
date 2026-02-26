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
# Helper function to ensure a label exists
ensure_label_exists() {
  local name=$1
  local description=$2
  local color=$3

  # Trim whitespace
  local clean_name=$(echo "$name" | xargs)
  if [ -z "$clean_name" ]; then return; fi

  # GitHub labels are case-insensitive, so we use grep -i for the check.
  # We assume EXISTING_LABELS is populated in the calling scope.
  if echo "$EXISTING_LABELS" | grep -iFxq -- "$clean_name"; then
    debug "Label '$clean_name' already exists."
  else
    log "Creating label '$clean_name'..."
    # We capture errors and check for "already exists" specifically,
    # providing a safety net if the existence check missed a label (e.g. due to race conditions).
    local cmd=("gh" "label" "create" "$clean_name")
    if [ -n "$description" ]; then cmd+=("--description" "$description"); fi
    if [ -n "$color" ]; then cmd+=("--color" "$color"); fi

    set +e
    local error_msg
    error_msg=$("${cmd[@]}" 2>&1)
    local exit_code=$?
    set -e

    if [ $exit_code -ne 0 ] && ! echo "$error_msg" | grep -qi "already exists"; then
      error "Failed to create label '$clean_name': $error_msg"
    fi
  fi
}

# =================================================================
# Ensure all managed labels exist in the repository
# =================================================================
group "Ensuring all managed labels exist"
# Get all existing labels once to avoid redundant API calls.
# We strip quotes and carriage returns to ensure reliable matching regardless of gh version or environment.
EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name' | tr -d '"\r')
jq -r '.[] | .name + "|" + .description + "|" + .color' .github/pr-labels.json | while IFS='|' read -r name description color; do
  ensure_label_exists "$name" "$description" "$color"
done
endgroup

# =================================================================
# Proceed with label management on the PR
# =================================================================

# Extract new labels from the review result JSON
NEW_LABELS=""
if [ -f "review_result.json" ] && [ "$(jq 'has("labels")' review_result.json)" == "true" ]; then
  NEW_LABELS=$(jq -r '.labels | .[]' review_result.json | tr '\n' ',' | sed 's/,$//')
fi

# Determine if a status label (approved/not approved/not reviewed) is present
HAS_STATUS_LABEL=false
if echo "$NEW_LABELS" | grep -qE "approved|not approved|not reviewed"; then
  HAS_STATUS_LABEL=true
fi

# If no status label is present, and we are forced to have one, we need to decide.
# If review_result.json is missing or review was skipped, use 'not reviewed'.
if [ "$HAS_STATUS_LABEL" = false ]; then
  if [ ! -f "review_result.json" ] || [ "$NEEDS_REVIEW" = "false" ]; then
    if [ -n "$NEW_LABELS" ]; then
      NEW_LABELS="$NEW_LABELS,not reviewed"
    else
      NEW_LABELS="not reviewed"
    fi
  else
    # This shouldn't happen with the updated gemini-client.ts, but as a fallback:
    warn "No status label found in review result. Defaulting to 'not reviewed'."
    if [ -n "$NEW_LABELS" ]; then
      NEW_LABELS="$NEW_LABELS,not reviewed"
    else
      NEW_LABELS="not reviewed"
    fi
  fi
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
    ensure_label_exists "$label"
  done
  endgroup

  log "Adding labels: $NEW_LABELS"
  gh pr edit $PR_NUMBER --add-label "$NEW_LABELS"
fi
