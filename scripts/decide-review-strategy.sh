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

# Fetch PR metadata once (comments + Ref OIDs) to reduce API calls and latency.
# This is done early to ensure SHAs are available for all paths, including manual overrides.
echo "::info::Fetching PR #$PR_NUMBER metadata..."
set +e
PR_DATA=$(gh pr view "$PR_NUMBER" --json comments,baseRefOid,headRefOid 2> gh_error.log)
GH_EXIT_CODE=$?
set -e

if [[ $GH_EXIT_CODE -ne 0 ]]; then
  echo "::warning::GitHub CLI failed to fetch PR data (Exit Code: $GH_EXIT_CODE)."
  cat gh_error.log >&2

  # For automated reviews, we fail-closed if the API is unreachable.
  if [[ "$TRIGGER_EVENT" == "pull_request" ]]; then
    echo "needs-review=false" >> "$GITHUB_OUTPUT"
    echo "skip-reason=GitHub API failure (Exit Code: $GH_EXIT_CODE)" >> "$GITHUB_OUTPUT"
    exit 0
  fi
  PR_DATA='{"comments":[],"baseRefOid":"","headRefOid":""}'
fi
rm -f gh_error.log

# Self-heal missing SHAs if they are absent from environment
if [ -z "$BASE_SHA" ] || [ "$BASE_SHA" == "null" ]; then BASE_SHA=$(echo "$PR_DATA" | jq -r '.baseRefOid // ""'); fi
if [ -z "$HEAD_SHA" ] || [ "$HEAD_SHA" == "null" ]; then HEAD_SHA=$(echo "$PR_DATA" | jq -r '.headRefOid // ""'); fi

# Address edge case: If API failed and inputs were empty, ensure SHAs are not empty
if [ -z "$BASE_SHA" ]; then
  echo "::warning::BASE_SHA is empty, falling back to HEAD^"
  BASE_SHA="HEAD^"
fi
if [ -z "$HEAD_SHA" ]; then
  echo "::warning::HEAD_SHA is empty, falling back to HEAD"
  HEAD_SHA="HEAD"
fi

# Check 0: Gemini Review Enablement
if [[ "${GEMINI_ENABLE_PR_REVIEW:-true}" == "false" ]]; then
  echo "::info::Gemini review is disabled via GEMINI_ENABLE_PR_REVIEW."
  echo "needs-review=false" >> "$GITHUB_OUTPUT"
  echo "skip-reason=Gemini review is disabled" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 1: Manual Override
# Bypasses all other checks except global enablement.
# Matches @bot-handle at start of string or after space, case-insensitively.
if { [[ "$TRIGGER_EVENT" == "comment" ]] && echo "$COMMENT_BODY" | grep -qiE "(^|[[:space:]])(@gemini-bot|@jules)"; } || \
   [[ "$TRIGGER_EVENT" == "workflow_dispatch" ]] || [[ "$FORCE_REVIEW" == "true" ]]; then
  echo "::info::Manual review triggered. Bypassing all checks."
  echo "needs-review=true" >> "$GITHUB_OUTPUT"
  echo "skip-reason=" >> "$GITHUB_OUTPUT"
  echo "base-sha=$BASE_SHA" >> "$GITHUB_OUTPUT"
  echo "head-sha=$HEAD_SHA" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 2: Comment Count Limit
COMMENT_COUNT=$(echo "$PR_DATA" | jq '.comments | length')
if [[ "$COMMENT_COUNT" -gt "$MAX_COMMENTS" ]]; then
  echo "::warning::PR has $COMMENT_COUNT comments, exceeding the limit of $MAX_COMMENTS. Skipping review."
  echo "needs-review=false" >> "$GITHUB_OUTPUT"
  echo "skip-reason=Exceeded comment limit of $MAX_COMMENTS comments" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 3: Time-Based Throttling
LAST_REVIEW_TIMESTAMP=$(echo "$PR_DATA" | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user)) | .[-1].createdAt // ""')

if [ -n "$LAST_REVIEW_TIMESTAMP" ]; then
  LAST_REVIEW_SECONDS=$(date -d "$LAST_REVIEW_TIMESTAMP" +%s)
  CURRENT_SECONDS=$(date +%s)
  MINUTES_SINCE_LAST_REVIEW=$(((CURRENT_SECONDS - LAST_REVIEW_SECONDS) / 60))

  if [[ "$MINUTES_SINCE_LAST_REVIEW" -lt "$REVIEW_THROTTLE_MINUTES" ]]; then
    echo "::warning::Last review was $MINUTES_SINCE_LAST_REVIEW minutes ago, within the $REVIEW_THROTTLE_MINUTES minute throttle period."
    echo "needs-review=false" >> "$GITHUB_OUTPUT"
    echo "skip-reason=Last review was less than $REVIEW_THROTTLE_MINUTES minutes ago" >> "$GITHUB_OUTPUT"
    exit 0
  fi
fi

echo "::info::Passed initial checks (override, limit, throttling). analyzing review necessity."

# Check 4: Quality Check Failures
if [[ "$PR_QUALITY_RESULT" != "success" ]]; then
  QUALITY_REPORT=$(echo "$PR_DATA" | jq -r \
    --arg bot_users "$QUALITY_GATE_BOT_USERNAMES" \
    '($bot_users | split(" ")) as $bot_list | .comments | map(select(.author.login? as $author | ($bot_list | index($author)) and ((.body // "") | contains("Quality Gate Results")))) | .[-1].body // ""'
  )
  
  if [ -z "$QUALITY_REPORT" ]; then
    NEEDS_REVIEW="false"
    SKIP_REASON="quality failure with no detailed report (likely static analysis)"
  else
    HAS_FAILURES=$(echo "$QUALITY_REPORT" | grep -ciE "Infra Tests.*❌|Unit Tests.*❌|Perf Tests.*❌|Visual Tests.*❌" || echo 0)
    
    if [[ $HAS_FAILURES -gt 0 ]]; then
      NEEDS_REVIEW="true"
      SKIP_REASON=""
    else
      NEEDS_REVIEW="false"
      SKIP_REASON="static analysis failures only (knip/lint/build)"
    fi
  fi
elif [[ "$TRIGGER_EVENT" == "pull_request" && "$ACTION_TYPE" == "opened" ]]; then
  NEEDS_REVIEW="true"
  SKIP_REASON=""
else
  # Check 6: Re-review based on new changes
  if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
    echo "::warning::Missing commit context. Triggering review to be safe."
    NEEDS_REVIEW="true"
    SKIP_REASON=""
  else
    # Find the last review comment from our bot
    LAST_BOT_BODY=$(echo "$PR_DATA" | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user and ((.body // "") | test("[0-9a-f]{7,40}|Review|Suggested|Failed|commit|analysis"; "i")))) | .[-1].body // ""')

    if [ -z "$LAST_BOT_BODY" ]; then
      NEEDS_REVIEW="true"
      SKIP_REASON=""
    else
      # Extract commit SHA from previous review
      LAST_REVIEWED_SHA=$(echo "$LAST_BOT_BODY" | grep -oP '(?<=> Failed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=commit: `)[a-f0-9]{7,40}(?=`)|(?<=`)[a-f0-9]{7,40}(?=` commit)' | head -n 1)
      if [ -z "$LAST_REVIEWED_SHA" ]; then
        LAST_REVIEWED_SHA=$(echo "$LAST_BOT_BODY" | grep -oE '\b[a-f0-9]{7,40}\b' | head -n 1)
      fi

      if [[ "$LAST_REVIEWED_SHA" == "$HEAD_SHA" ]]; then
          SKIP_REASON="already reviewed this commit ($HEAD_SHA)"
          NEEDS_REVIEW="false"
      else
          # Determine which commit to compare against for change analysis
          COMPARE_SHA="$LAST_REVIEWED_SHA"
          if [ -z "$COMPARE_SHA" ] || ! git cat-file -e "$COMPARE_SHA" 2>/dev/null; then
             COMPARE_SHA="$BASE_SHA"
          fi

          CHANGED_FILES=$(git diff --name-only "$COMPARE_SHA" "$HEAD_SHA")
          SIGNIFICANT_COUNT=$( (echo "$CHANGED_FILES" | grep -cvE '(\.md$|\.png$|\.svg$|pnpm-lock\.yaml$|\.gitignore$)' 2>/dev/null || echo 0) | head -n 1)

          if [[ "$SIGNIFICANT_COUNT" -eq 0 ]]; then
              SKIP_REASON="no significant code changes since $COMPARE_SHA"
              NEEDS_REVIEW="false"
          else
              NEEDS_REVIEW="true"
              SKIP_REASON=""
          fi
      fi
    fi
  fi
fi

# --- Final Output ---
echo "::info::Final Decision: needs-review=$NEEDS_REVIEW (Reason: $SKIP_REASON)"
echo "needs-review=$NEEDS_REVIEW" >> "$GITHUB_OUTPUT"
echo "skip-reason=$SKIP_REASON" >> "$GITHUB_OUTPUT"
echo "base-sha=$BASE_SHA" >> "$GITHUB_OUTPUT"
echo "head-sha=$HEAD_SHA" >> "$GITHUB_OUTPUT"
