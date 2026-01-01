#!/bin/bash
set -e

# This script determines if a Gemini review is needed for a pull request.
# It outputs two lines:
# needs-review=<true|false>
# skip-reason=<string>

# Read environment variables passed from the workflow
TRIGGER_EVENT="${TRIGGER_EVENT}"
ACTION_TYPE="${ACTION_TYPE}"
COMMENT_BODY="${COMMENT_BODY}"
PR_NUMBER="${PR_NUMBER}"
BASE_SHA="${BASE_SHA}"
HEAD_SHA="${HEAD_SHA}"
PR_QUALITY_RESULT="${PR_QUALITY_RESULT}"

# Set default outputs
NEEDS_REVIEW="false"
SKIP_REASON="no criteria met"

# --- Check for quality check failures first ---
if [[ "$PR_QUALITY_RESULT" != "success" ]]; then
  # Fetch the quality report to determine the type of failure
  QUALITY_REPORT=$(gh pr view "$PR_NUMBER" --json comments -q '.comments | map(select(.author.login? == "arii" and (.body | contains("Quality Gate Results")))) | .[-1].body // ""')
  
  if [ -z "$QUALITY_REPORT" ]; then
    echo "::info::Quality checks failed but no report found. Skipping review."
    NEEDS_REVIEW="false"
    SKIP_REASON="quality failure with no detailed report (likely static analysis)"
  else
    # Check if only static analysis checks failed (knip, lint, build)
    # If only these failed, skip review. Otherwise, review runtime/test failures
    HAS_KNIP_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Knip.*❌" || echo 0)
    HAS_LINT_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Lint.*❌" || echo 0)
    HAS_BUILD_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Build.*❌" || echo 0)
    HAS_INFRA_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Infra Tests.*❌" || echo 0)
    HAS_UNIT_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Unit Tests.*❌" || echo 0)
    HAS_PERF_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Perf Tests.*❌" || echo 0)
    HAS_VISUAL_FAILURE=$(echo "$QUALITY_REPORT" | grep -c "Visual Tests.*❌" || echo 0)
    
    # Only trigger review if there are runtime/integration test failures, not just static analysis
    if [[ $HAS_INFRA_FAILURE -gt 0 || $HAS_UNIT_FAILURE -gt 0 || $HAS_PERF_FAILURE -gt 0 || $HAS_VISUAL_FAILURE -gt 0 ]]; then
      echo "::info::Runtime/test failures detected. Triggering review to analyze."
      NEEDS_REVIEW="true"
      SKIP_REASON=""
    else
      echo "::info::Only static analysis failures (knip/lint/build). Skipping review."
      NEEDS_REVIEW="false"
      SKIP_REASON="static analysis failures only (knip/lint/build)"
    fi
  fi
# --- Always review on initial PR open ---
elif [[ "$TRIGGER_EVENT" == "pull_request" && "$ACTION_TYPE" == "opened" ]]; then
  echo "::info::PR opened. Triggering initial review."
  NEEDS_REVIEW="true"
  SKIP_REASON=""
# --- Always review on manual comment triggers ---
elif [[ "$TRIGGER_EVENT" == "comment" && ( "$COMMENT_BODY" == *@gemini-bot* || "$COMMENT_BODY" == *@jules* ) ]]; then
  echo "::info::Manual review triggered by comment."
  NEEDS_REVIEW="true"
  SKIP_REASON=""
else
  # --- This is a re-review or a CI failure trigger ---
  echo "::info::Analyzing for re-review..."

  # 1. Find the last relevant comment from the bot
  # It can be a review summary, code suggestion, or CI failure report
  # Look for common patterns: commit hashes or review-related keywords
  LAST_COMMENT_BODY=$(gh pr view "$PR_NUMBER" --json comments -q '.comments | map(select(.author.login? == "arii" and (.body | test("[0-9a-f]{7,40}|Review|Suggested|Failed|commit|analysis"; "i")))) | .[-1].body // ""')

  if [ -z "$LAST_COMMENT_BODY" ]; then
    echo "::info::No previous review or failure comment found. Triggering review."
    NEEDS_REVIEW="true"
    SKIP_REASON=""
  else
    # 2. Extract the last reviewed commit hash from the comment
    # Try multiple patterns to find commit hashes
    LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oP '(?<=> Failed at commit: `)[a-f0-9]{7,40}(?=`)|(?<=Reviewed commit: `)[a-f0-9]{7,40}(?=`)|(?<=commit: `)[a-f0-9]{7,40}(?=`)|(?<=`)[a-f0-9]{7,40}(?=` commit)' | head -1)
    
    # If no hash found with backticks, try hex pattern (7-40 chars)
    if [ -z "$LAST_REVIEWED_SHA" ]; then
      LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oE '\b[a-f0-9]{7,40}\b' | head -1)
    fi

    if [ -z "$LAST_REVIEWED_SHA" ]; then
        echo "::warning::Found a previous comment, but could not extract a commit hash. Proceeding with review."
        NEEDS_REVIEW="true"
        SKIP_REASON=""
    else
        echo "::info::Last reviewed commit SHA is: $LAST_REVIEWED_SHA"
        echo "::info::Current HEAD SHA is: $HEAD_SHA"

        # 3. Compare with the current HEAD SHA
        if [[ "$LAST_REVIEWED_SHA" == "$HEAD_SHA" ]]; then
            SKIP_REASON="already reviewed this commit ($HEAD_SHA)"
            NEEDS_REVIEW="false"
        else
            # 4. Hashes are different, check if the changes are substantial
            echo "::info::Commit hashes differ. Checking for substantial changes between $LAST_REVIEWED_SHA and $HEAD_SHA..."
            # Ensure the last reviewed SHA is actually in the history
            if git cat-file -e "$LAST_REVIEWED_SHA" 2>/dev/null; then
                CHANGED_FILES=$(git diff --name-only "$LAST_REVIEWED_SHA" "$HEAD_SHA")

                if [ -z "$CHANGED_FILES" ]; then
                    SKIP_REASON="no file changes detected between $LAST_REVIEWED_SHA and $HEAD_SHA"
                    NEEDS_REVIEW="false"
                else
                    echo "::info::Files changed:\n$CHANGED_FILES"
                    # Count significant changes (exclude docs, lockfiles, etc.)
                    SIGNIFICANT_COUNT=$(echo "$CHANGED_FILES" | grep -vE '(\.md$|\.png$|\.svg$|pnpm-lock\.yaml$|\.gitignore$)' | wc -l)

                    if [[ "$SIGNIFICANT_COUNT" -eq 0 ]]; then
                        SKIP_REASON="no significant code changes since last review at $LAST_REVIEWED_SHA"
                        NEEDS_REVIEW="false"
                    else
                        echo "::info::$SIGNIFICANT_COUNT significant change(s) detected. Triggering re-review."
                        NEEDS_REVIEW="true"
                        SKIP_REASON=""
                    fi
                fi
            else
                echo "::warning::Last reviewed commit SHA ($LAST_REVIEWED_SHA) not found in history. Reviewing all changes from base."
                # Fallback to diffing against the base of the PR
                CHANGED_FILES=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")
                SIGNIFICANT_COUNT=$(echo "$CHANGED_FILES" | grep -vE '(\.md$|\.png$|\.svg$|pnpm-lock\.yaml$|\.gitignore$)' | wc -l)
                if [[ "$SIGNIFICANT_COUNT" -eq 0 ]]; then
                    SKIP_REASON="no significant code changes from base"
                    NEEDS_REVIEW="false"
                else
                    NEEDS_REVIEW="true"
                    SKIP_REASON=""
                fi
            fi
        fi
    fi
  fi
fi

echo "needs-review=$NEEDS_REVIEW" >> $GITHUB_OUTPUT
echo "skip-reason=$SKIP_REASON" >> $GITHUB_OUTPUT
