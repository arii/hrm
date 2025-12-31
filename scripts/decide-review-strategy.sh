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
  echo "::info::Quality checks failed. Triggering review to analyze failures."
  NEEDS_REVIEW="true"
  SKIP_REASON=""
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
  # It can be a review summary or a CI failure report. Both should contain a commit hash.
  LAST_COMMENT_BODY=$(gh pr view "$PR_NUMBER" --json comments -q '.comments | map(select(.author.login? == "arii" and (.body | contains("## Review") or contains("Review Summary") or contains("Suggested Fix") or contains("> Failed at commit:")))) | .[-1].body // ""')

  if [ -z "$LAST_COMMENT_BODY" ]; then
    echo "::info::No previous review or failure comment found. Triggering review."
    NEEDS_REVIEW="true"
    SKIP_REASON=""
  else
    # 2. Extract the last reviewed commit hash from the comment
    # The line looks like: `> Failed at commit: `commit_sha`` or `> Reviewed commit: `commit_sha``
    LAST_REVIEWED_SHA=$(echo "$LAST_COMMENT_BODY" | grep -oP '(?<=> Failed at commit: `)[a-f0-9]+(?=`)|(?<=Reviewed commit: `)[a-f0-9]+(?=`)')

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
