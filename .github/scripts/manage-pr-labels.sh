#!/bin/bash
# .github/scripts/manage-pr-labels.sh
# Robust label management with retries and graceful handling of missing review results

log() { echo "$*"; }
warn() { echo "::warning::$*"; }
error() { echo "::error::$*"; exit 1; }
group() { echo "::group::$1"; }
endgroup() { echo "::endgroup::"; }

if [ -z "$GH_TOKEN" ] || [ -z "$PR_NUMBER" ]; then
  error "GH_TOKEN and PR_NUMBER environment variables are required."
fi

# Function to ensure a label exists with retries
ensure_label_exists() {
  local name=$1
  local description=$2
  local color=$3
  local clean_name=$(echo "$name" | xargs)
  if [ -z "$clean_name" ]; then return; fi

  if echo "$EXISTING_LABELS" | grep -iFxq -- "$clean_name" > /dev/null; then
    return
  fi

  log "Creating label '$clean_name'..."
  for i in {1..3}; do
    if gh label create "$clean_name" ${description:+--description "$description"} ${color:+--color "$color"} 2>/dev/null; then
      return
    fi
    if gh label list --limit 1000 --json name --jq '.[].name' | grep -iFxq -- "$clean_name" > /dev/null; then
      return
    fi
    warn "Attempt $i to create label '$clean_name' failed, retrying..."
    sleep 5
  done
}

group "Ensuring all managed labels exist"
# Get existing labels with retry
for i in {1..3}; do
  EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name' 2>/dev/null | tr -d '"\r') && break || sleep 5
done

if [ -f ".github/pr-labels.json" ]; then
  while IFS='|' read -r name description color; do
    ensure_label_exists "$name" "$description" "$color"
  done < <(jq -r '.[] | .name + "|" + .description + "|" + .color' .github/pr-labels.json)
fi
endgroup

NEW_LABELS=""
if [ -f "review_result.json" ]; then
  if [ "$(jq 'has("labels")' review_result.json 2>/dev/null)" == "true" ]; then
    NEW_LABELS=$(jq -r '.labels | .[]' review_result.json | tr '\n' ',' | sed 's/,$//')
  fi
fi

# Determine if a status label is present
if ! echo "$NEW_LABELS" | grep -qE "approved|not approved|not reviewed"; then
    NEW_LABELS="${NEW_LABELS:+$NEW_LABELS,}not reviewed"
fi

group "Label Details for PR #$PR_NUMBER"
# Retry PR view
for i in {1..3}; do
  CURRENT_LABELS=$(gh pr view "$PR_NUMBER" --json labels --jq '.labels[].name' 2>/dev/null) && break || sleep 5
done
log "Current labels on PR: $CURRENT_LABELS"
log "New labels to apply: $NEW_LABELS"
endgroup

group "Cleaning up automated review and obsolete labels"
if [ -x "./scripts/ci/cleanup-pr-labels.sh" ]; then
  for i in {1..3}; do
    if GH_TOKEN="$GH_TOKEN" ./scripts/ci/cleanup-pr-labels.sh "$PR_NUMBER" review; then
      break
    fi
    warn "Cleanup attempt $i failed, retrying..."
    sleep 5
  done
fi
endgroup

if [ -n "$NEW_LABELS" ]; then
  group "Ensuring new labels exist before applying"
  IFS=',' read -ra LABELS_ARR <<< "$NEW_LABELS"
  # Refresh existing labels
  for i in {1..3}; do
    EXISTING_LABELS=$(gh label list --limit 1000 --json name --jq '.[].name' 2>/dev/null | tr -d '"\r') && break || sleep 5
  done
  for label in "${LABELS_ARR[@]}"; do
    ensure_label_exists "$label"
  done
  endgroup

  log "Adding labels: $NEW_LABELS"
  for i in {1..3}; do
    if gh pr edit "$PR_NUMBER" --add-label "$NEW_LABELS"; then
      log "Successfully updated labels."
      exit 0
    fi
    warn "Label add attempt $i failed, retrying..."
    sleep 10
  done
  error "Failed to add labels after 3 attempts."
fi
