#!/bin/bash
set -e

# This script determines if a Gemini review is needed for a pull request.
# It outputs two lines to the GitHub Actions output file:
#   needs-review=<true|false>
#   skip-reason=<string>

# --- Environment Variables ---
# Required variables
: "${TRIGGER_EVENT:?}"
: "${ACTION_TYPE:?}"
: "${PR_NUMBER:?}"
: "${PR_QUALITY_RESULT:?}"

# Optional variables
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"
COMMENT_BODY="${COMMENT_BODY:-}"
FORCE_REVIEW="${FORCE_REVIEW:-false}"

# Configuration with defaults
: "${MAX_COMMENTS:=60}"
: "${REVIEW_THROTTLE_MINUTES:=30}"
: "${BOT_USERNAME:=gemini-bot}"
: "${QUALITY_GATE_BOT_USERNAMES:=github-actions[bot]}"

# --- Initial State ---
NEEDS_REVIEW="false"
SKIP_REASON="no criteria met"

# --- Main Logic ---

# Check 1: Manual Override (PRIORITIZED)
# We check this first to bypass all other criteria including global enablement.
# Use bash lowercasing for case-insensitive handle comparison.
if [[ "$TRIGGER_EVENT" == "comment" && ( "${COMMENT_BODY,,}" == *@gemini-bot* || "${COMMENT_BODY,,}" == *@jules* ) ]] || \
   [[ "$TRIGGER_EVENT" == "workflow_dispatch" ]] || \
   [[ "$FORCE_REVIEW" == "true" ]]; then
  echo "::info::Manual review triggered. Bypassing all checks."
  echo "needs-review=true" >> "$GITHUB_OUTPUT"
  echo "skip-reason=" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 0: Gemini Review Enablement
if [[ "${GEMINI_ENABLE_PR_REVIEW:-true}" == "false" ]]; then
  echo "::info::Gemini review is disabled via GEMINI_ENABLE_PR_REVIEW."
  echo "needs-review=false" >> "$GITHUB_OUTPUT"
  echo "skip-reason=Gemini review is disabled" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Fetch PR data once to improve performance and avoid rate-limiting.
echo "::info::Fetching PR #$PR_NUMBER metadata and comments..."
PR_DATA_FILE=$(mktemp)
set +e
gh pr view "$PR_NUMBER" --json comments > "$PR_DATA_FILE" 2> gh_error.log
GH_EXIT_CODE=$?
set -e

if [[ $GH_EXIT_CODE -ne 0 ]]; then
  echo "::warning::GitHub CLI failed to fetch PR data (Exit Code: $GH_EXIT_CODE)."
  cat gh_error.log >&2

  # For automated reviews, we fail-closed if the API is down to avoid noise/errors.
  if [[ "$TRIGGER_EVENT" == "pull_request" ]]; then
    echo "needs-review=false" >> "$GITHUB_OUTPUT"
    echo "skip-reason=GitHub API failure (Exit Code: $GH_EXIT_CODE)" >> "$GITHUB_OUTPUT"
    exit 0
  fi
  PR_DATA='{"comments":[]}'
else
  PR_DATA=$(cat "$PR_DATA_FILE")
fi
rm -f "$PR_DATA_FILE" gh_error.log

# Check 2: Comment Count Limit
COMMENT_COUNT=$(echo "$PR_DATA" | jq '.comments | length' 2>/dev/null || echo 0)
if [[ "$COMMENT_COUNT" -gt "$MAX_COMMENTS" ]]; then
  echo "::warning::PR has $COMMENT_COUNT comments, exceeding the limit of $MAX_COMMENTS. Skipping review."
  echo "needs-review=false" >> "$GITHUB_OUTPUT"
  echo "skip-reason=Exceeded comment limit of $MAX_COMMENTS comments" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 3: Time-Based Throttling
LAST_REVIEW_TIMESTAMP=$(echo "$PR_DATA" | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user)) | .[-1].createdAt // ""' 2>/dev/null || echo "")

if [ -n "$LAST_REVIEW_TIMESTAMP" ]; then
  LAST_REVIEW_SECONDS=$(date -d "$LAST_REVIEW_TIMESTAMP" +%s)
  CURRENT_SECONDS=$(date +%s)
  MINUTES_SINCE_LAST_REVIEW=$(((CURRENT_SECONDS - LAST_REVIEW_SECONDS) / 60))

  if [[ "$MINUTES_SINCE_LAST_REVIEW" -lt "$REVIEW_THROTTLE_MINUTES" ]]; then
    echo "::warning::Last review was $MINUTES_SINCE_LAST_REVIEW minutes ago, which is within the $REVIEW_THROTTLE_MINUTES minute throttle period. Skipping."
    echo "needs-review=false" >> "$GITHUB_OUTPUT"
    echo "skip-reason=Last review was less than $REVIEW_THROTTLE_MINUTES minutes ago" >> "$GITHUB_OUTPUT"
    exit 0
  fi
fi

# Check 4: Quality Check Failures
if [[ "$PR_QUALITY_RESULT" != "success" ]]; then
  QUALITY_REPORT=$(echo "$PR_DATA" | jq -r \
    --arg bot_users "$QUALITY_GATE_BOT_USERNAMES" \
    '($bot_users | split(" ")) as $bot_list | .comments | map(select(.author.login? as $author | ($bot_list | index($author)) and ((.body // "") | contains("Quality Gate Results")))) | .[-1].body // ""' 2>/dev/null || echo ""
  )
  
  if [ -n "$QUALITY_REPORT" ]; then
    HAS_INFRA_FAILURE=$( (echo "$QUALITY_REPORT" | grep -c "Infra Tests.*❌" 2>/dev/null || echo 0) | head -n 1)
    HAS_UNIT_FAILURE=$( (echo "$QUALITY_REPORT" | grep -c "Unit Tests.*❌" 2>/dev/null || echo 0) | head -n 1)
    HAS_PERF_FAILURE=$( (echo "$QUALITY_REPORT" | grep -c "Perf Tests.*❌" 2>/dev/null || echo 0) | head -n 1)
    HAS_VISUAL_FAILURE=$( (echo "$QUALITY_REPORT" | grep -c "Visual Tests.*❌" 2>/dev/null || echo 0) | head -n 1)
    
    if [[ $HAS_INFRA_FAILURE -gt 0 || $HAS_UNIT_FAILURE -gt 0 || $HAS_PERF_FAILURE -gt 0 || $HAS_VISUAL_FAILURE -gt 0 ]]; then
      NEEDS_REVIEW="true"
      SKIP_REASON=""
    else
      NEEDS_REVIEW="false"
      SKIP_REASON="static analysis failures only (knip/lint/build)"
    fi
  else
    NEEDS_REVIEW="false"
    SKIP_REASON="quality failure with no detailed report (likely static analysis)"
  fi
# Check 5: New Pull Request
elif [[ "$TRIGGER_EVENT" == "pull_request" && "$ACTION_TYPE" == "opened" ]]; then
  NEEDS_REVIEW="true"
  SKIP_REASON=""
else
  # Check 6: Re-review based on new changes
  if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
    echo "::warning::Missing commit context (BASE_SHA/HEAD_SHA). Triggering review to be safe."
    NEEDS_REVIEW="true"
    SKIP_REASON=""
  else
    LAST_COMMENT_BODY=$(echo "$PR_DATA" | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user and ((.body // "") | test("[0-9a-f]{7,40}|Review|Suggested|Failed|commit|analysis"; "i")))) | .[-1].body // ""' 2>/dev/null || echo "")

    if [ -z "$LAST_COMMENT_BODY" ]; then
      NEEDS_REVIEW="true"
      SKIP_REASON=""
    else
      LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oP '(?<=> Failed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=commit: `)[a-f0-9]{7,40}(?=`)|(?<=`)[a-f0-9]{7,40}(?=` commit)' | head -n 1)

      if [ -z "$LAST_REVIEWED_SHA" ]; then
        LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oE '\b[a-f0-9]{7,40}\b' | head -n 1)
      fi

      if [ -z "$LAST_REVIEWED_SHA" ] || [[ "$LAST_REVIEWED_SHA" != "$HEAD_SHA" ]]; then
          NEEDS_REVIEW="true"
          SKIP_REASON=""
          if [ -n "$LAST_REVIEWED_SHA" ] && git cat-file -e "$LAST_REVIEWED_SHA" 2>/dev/null; then
              CHANGED_FILES=$(git diff --name-only "$LAST_REVIEWED_SHA" "$HEAD_SHA")
              SIGNIFICANT_COUNT=$( (echo "$CHANGED_FILES" | grep -cvE '(\.md$|\.png$|\.svg$|pnpm-lock\.yaml$|\.gitignore$)' 2>/dev/null || echo 0) | head -n 1)
              if [[ "$SIGNIFICANT_COUNT" -eq 0 ]]; then
                  SKIP_REASON="no significant code changes since last review at $LAST_REVIEWED_SHA"
                  NEEDS_REVIEW="false"
              fi
          fi
      else
          SKIP_REASON="already reviewed this commit ($HEAD_SHA)"
          NEEDS_REVIEW="false"
      fi
    fi
  fi
fi

# --- Final Output ---
echo "needs-review=$NEEDS_REVIEW" >> "$GITHUB_OUTPUT"
echo "skip-reason=$SKIP_REASON" >> "$GITHUB_OUTPUT"
