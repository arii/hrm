#!/bin/bash
set -e

# This script determines if a Gemini review is needed for a pull request.
# It outputs two lines to the GitHub Actions output file:
#   needs-review=<true|false>
#   skip-reason=<string>

# --- Environment Variables ---
# These are expected to be provided by the calling GitHub Actions workflow.
: "${TRIGGER_EVENT:?}"
: "${ACTION_TYPE:?}"
: "${PR_NUMBER:?}"
: "${BASE_SHA:?}"
: "${HEAD_SHA:?}"
: "${PR_QUALITY_RESULT:?}"
# Configuration with defaults
: "${MAX_COMMENTS:=60}"
: "${REVIEW_THROTTLE_MINUTES:=30}"
: "${BOT_USERNAME:=gemini-bot}"
# Can be a single username or a space-separated list of usernames.
# Refer to docs/DEVELOPMENT.md for more details on this variable.
: "${QUALITY_GATE_BOT_USERNAMES:=github-actions[bot]}"
# This variable is optional and may not be present for all event types.
: "${COMMENT_BODY:=}"

# Regex to filter trivial files (assets, locks, configs, docs)
IGNORE_PATTERN='\.(md|png|svg|ico|jpg|jpeg|gif|webp)$|(package-lock\.json|pnpm-lock\.yaml|\.gitignore|\.editorconfig)$'

# Function to check for substantive changes. Sets NEEDS_REVIEW and SKIP_REASON globally.
check_substantive() {
    local target_base="$1"
    local target_head="$2"
    local reason_suffix="$3"

    # Direct pipe reduces intermediate variables and improves code ratio
    if [ -z "$(git diff --name-only "$target_base" "$target_head" | grep -vE "$IGNORE_PATTERN" || true)" ]; then
        NEEDS_REVIEW="false"
        SKIP_REASON="no significant code changes $reason_suffix (filtered by anti-slop rules)"
    else
        NEEDS_REVIEW="true"
        SKIP_REASON=""
    fi
}


# --- Initial State ---
NEEDS_REVIEW="false"
SKIP_REASON="no criteria met"

# --- Main Logic ---

# Check 1: Manual Override
# A manual trigger (e.g., a specific comment) always forces a review, bypassing all other checks.
if [[ "$TRIGGER_EVENT" == "comment" && ( "$COMMENT_BODY" == *@gemini-bot* || "$COMMENT_BODY" == *@jules* ) ]]; then
  echo "::info::Manual review triggered by comment. Bypassing all checks."
  echo "needs-review=true" >> "$GITHUB_OUTPUT"
  echo "skip-reason=" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 2: Comment Count Limit
# Prevents reviews on PRs that are excessively noisy.
COMMENT_COUNT=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments | length')
if [[ "$COMMENT_COUNT" -gt "$MAX_COMMENTS" ]]; then
  echo "::warning::PR has $COMMENT_COUNT comments, exceeding the limit of $MAX_COMMENTS. Skipping review."
  echo "needs-review=false" >> "$GITHUB_OUTPUT"
  echo "skip-reason=Exceeded comment limit of $MAX_COMMENTS comments" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Check 3: Time-Based Throttling
# Prevents multiple reviews within a short time frame.
LAST_REVIEW_TIMESTAMP=$(gh pr view "$PR_NUMBER" --json comments | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user)) | .[-1].createdAt // ""')

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

# If we've passed the initial gatekeeping checks, proceed to the core review decision logic.
echo "::info::Passed initial checks (manual override, comment limit, throttling). Proceeding to analyze review necessity."

# Check 4: Quality Check Failures
# The first priority is to review PRs that have failed CI checks.
if [[ "$PR_QUALITY_RESULT" != "success" ]]; then
  # Use the dedicated QUALITY_GATE_BOT_USERNAMES to find the correct report.
  # This query is broken down for readability:
  #   1. `--arg bot_users "$QUALITY_GATE_BOT_USERNAMES"`: Pass the usernames as a variable.
  #   2. `($bot_users | split(" ")) as $bot_list`: Split the string into an array of bot names.
  #   3. `map(select(...))`: Filter the comments array.
  #   4. `(.author.login? as $author | $bot_list | index($author))`: Check if the comment author is in our bot list.
  #   5. `((.body // "") | contains("Quality Gate Results"))`: Check if the comment body contains the quality gate string.
  #   6. `| .[-1].body // ""`: Get the body of the last matching comment, or an empty string if none matched.
  QUALITY_REPORT=$(gh pr view "$PR_NUMBER" --json comments | jq -r \
    --arg bot_users "$QUALITY_GATE_BOT_USERNAMES" \
    '($bot_users | split(" ")) as $bot_list | .comments | map(select(.author.login? as $author | ($bot_list | index($author)) and ((.body // "") | contains("Quality Gate Results")))) | .[-1].body // ""'
  )
  
  if [ -z "$QUALITY_REPORT" ]; then
    NEEDS_REVIEW="false"
    SKIP_REASON="quality failure with no detailed report (likely static analysis)"
  else
    # Check for specific types of test failures that warrant an AI review.
    # The `grep | head` combination ensures we only get a single number.
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
  fi
# Check 5: New Pull Request
# Always review a PR when it is first opened.
elif [[ "$TRIGGER_EVENT" == "pull_request" && "$ACTION_TYPE" == "opened" ]]; then
  NEEDS_REVIEW="true"
  SKIP_REASON=""
else
  # Check 6: Re-review based on new changes
  # This handles subsequent pushes to an already-open PR.
  echo "::info::Analyzing for re-review..."

  # Use the AI review bot's username to find the last review comment.
  LAST_COMMENT_BODY=$(gh pr view "$PR_NUMBER" --json comments | jq -r --arg bot_user "$BOT_USERNAME" '.comments | map(select(.author.login? == $bot_user and ((.body // "") | test("[0-9a-f]{7,40}|Review|Suggested|Failed|commit|analysis"; "i")))) | .[-1].body // ""')

  if [ -z "$LAST_COMMENT_BODY" ]; then
    NEEDS_REVIEW="true"
    SKIP_REASON=""
  else
    # Extract the commit SHA from the last review comment to see if it's outdated.
    LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oP '(?<=> Failed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed commit: `)[a-f0-9]{7,40}(?=`)|(?<=commit: `)[a-f0-9]{7,40}(?=`)|(?<=`)[a-f0-9]{7,40}(?=` commit)' | head -n 1)
    
    if [ -z "$LAST_REVIEWED_SHA" ]; then
      LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oE '\b[a-f0-9]{7,40}\b' | head -n 1)
    fi

    if [ -z "$LAST_REVIEWED_SHA" ]; then
        NEEDS_REVIEW="true"
        SKIP_REASON=""
    else
        if [[ "$LAST_REVIEWED_SHA" == "$HEAD_SHA" ]]; then
            SKIP_REASON="already reviewed this commit ($HEAD_SHA)"
            NEEDS_REVIEW="false"
        else
            # Check for substantial code changes since the last review.
            if git cat-file -e "$LAST_REVIEWED_SHA" 2>/dev/null; then
                check_substantive "$LAST_REVIEWED_SHA" "$HEAD_SHA" "since last review at $LAST_REVIEWED_SHA"
            else
                # Fallback if the last reviewed SHA is not in the history (e.g., after a force-push).
                check_substantive "$BASE_SHA" "$HEAD_SHA" "from base"
            fi
        fi
    fi
  fi
fi

# --- Final Output ---
# Log the final decision and write to the output file for GitHub Actions.
echo "::info::Final Decision: needs-review=$NEEDS_REVIEW (Reason: $SKIP_REASON)"
echo "needs-review=$NEEDS_REVIEW" >> "$GITHUB_OUTPUT"
echo "skip-reason=$SKIP_REASON" >> "$GITHUB_OUTPUT"
