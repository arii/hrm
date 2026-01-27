#!/bin/bash
# This script aggregates test failures from a CI run, posts a comment to the
# corresponding Pull Request, and generates a structured JSON artifact for downstream
# automated review workflows.

set -e # Exit immediately if a command exits with a non-zero status.
set -o pipefail # Return the exit status of the last command in the pipe that failed.

# --- 1. SETUP & VALIDATION ---
# Ensure all required environment variables are set. These are expected to be
# provided by the GitHub Actions workflow environment.
REQUIRED_VARS=(
  "GH_TOKEN"
  "GITHUB_REPOSITORY"
  "GITHUB_RUN_ID"
  "GITHUB_SHA"
  "LOG_TRUNCATE_BYTES"
  "LINT_OUTCOME"
  "BUILD_OUTCOME"
  "INFRA_TESTS_DEV_OUTCOME"
  "INFRA_TESTS_PROD_OUTCOME"
  "UNIT_TESTS_OUTCOME"
  "VISUAL_TESTS_OUTCOME"
  "PERF_TESTS_OUTCOME"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "::error::Required environment variable '$var' is not set. Exiting."
    exit 1
  fi
done

# Find PR number associated with the current branch/commit.
echo "::group::Finding Pull Request Number"
PR_NUMBER=$(gh pr list --head "${GITHUB_HEAD_REF}" --json number --jq '.[0].number')
if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" == "null" ]; then
  echo "::warning::No Pull Request found for this branch. Skipping comment."
  exit 0 # Exit cleanly as there's nothing to do
fi
echo "Found PR #${PR_NUMBER}"
echo "::endgroup::"


COMMENT_FILE="test-results/pr-comment.md"
JSON_REPORT_FILE="test-results/failure-report.json"
mkdir -p test-results

# Define checks in a readable, maintainable format.
# Each line: <OUTCOME_VAR_NAME>|<Display Name>|<primary_log_file>
read -r -d '' CHECKS_DEFINITION <<'EOF'
LINT_OUTCOME|Lint|logs/lint-output.log
BUILD_OUTCOME|Build|logs/build-output.log
INFRA_TESTS_DEV_OUTCOME|Infrastructure (Dev)|logs/infra-dev-output.log
INFRA_TESTS_PROD_OUTCOME|Infrastructure (Prod)|logs/infra-prod-output.log
UNIT_TESTS_OUTCOME|Unit Tests|logs/unit-output.log
VISUAL_TESTS_OUTCOME|Visual Tests|logs/visual-output.log
PERF_TESTS_OUTCOME|Performance Tests|logs/performance-output.log
EOF


# --- 2. AGGREGATION ---
echo "::group::Aggregating Failure Logs"
FAILED_CHECKS_LIST=""
LOGS_BODY=""
FAILED_CHECKS_JSON="[]" # Initialize JSON array

# Helper function to get sanitized, truncated log content
get_log_content() {
  local log_file="$1"
  if [ -f "$log_file" ]; then
    # Truncate and strip ANSI color codes
    tail -c "${LOG_TRUNCATE_BYTES}" "$log_file" | sed -r 's/\x1b\[[0-9;]*m//g'
  else
    echo "_Log file not found: ${log_file}_"
  fi
}

# Helper function to append a log file's content to the markdown comment body
append_log_to_body() {
  local log_file="$1"
  local test_name="$2"
  local log_content
  log_content=$(get_log_content "$log_file")
  LOGS_BODY="${LOGS_BODY}\n### ${test_name} Log\n\`\`\`\n${log_content}\n\`\`\`\n"
}

while IFS='|' read -r outcome_var display_name log_file; do
  # Use indirect expansion to get the outcome value (e.g., $LINT_OUTCOME)
  if [ "${!outcome_var}" == "failure" ]; then
    echo "Found failure in: ${display_name}"
    # --- For PR Comment ---
    if [ -z "$FAILED_CHECKS_LIST" ]; then FAILED_CHECKS_LIST="$display_name"; else FAILED_CHECKS_LIST="$FAILED_CHECKS_LIST, $display_name"; fi
    append_log_to_body "$log_file" "$display_name"
    # Special case: Performance tests have additional, specific logs
    if [ "$display_name" == "Performance Tests" ]; then
      append_log_to_body "logs/ws-stress-client.log" "WebSocket Stress Client"
      append_log_to_body "logs/frontend-perf-server.log" "Frontend Perf Server"
    fi

    # --- For JSON Report ---
    primary_log_content=$(get_log_content "$log_file")
    if [ "$display_name" == "Performance Tests" ]; then
      ws_log_content=$(get_log_content "logs/ws-stress-client.log")
      frontend_log_content=$(get_log_content "logs/frontend-perf-server.log")
      primary_log_content="${primary_log_content}\n\n--- WebSocket Stress Client Log ---\n${ws_log_content}\n\n--- Frontend Perf Server Log ---\n${frontend_log_content}"
    fi

    # Create a JSON object for the failed check
    check_json=$(jq -n \
      --arg name "$display_name" \
      --arg conclusion "failure" \
      --arg url "https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}" \
      --arg logs "$primary_log_content" \
      '{name: $name, conclusion: $conclusion, detailsUrl: $url, logs: $logs}')

    # Add the object to our JSON array
    FAILED_CHECKS_JSON=$(echo "$FAILED_CHECKS_JSON" | jq --argjson item "$check_json" '. + [$item]')
  fi
done <<< "$CHECKS_DEFINITION"
echo "::endgroup::"

# --- 3. REPORTING ---
if [ -n "$FAILED_CHECKS_LIST" ]; then
  echo "::group::Posting PR Comment"
  # --- Post PR Comment ---
  COMMIT_HASH_MSG="> Failed at commit: \`${GITHUB_SHA}\`"
  COMMENT_HEADER="CI checks failed: ${FAILED_CHECKS_LIST}.\n\n${COMMIT_HASH_MSG}\n\n"
  LOG_FOOTER="---\n*Note: Logs are truncated. View the [full workflow run](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}) for details.*"
  COMMENT_DETAILS="<details><summary><strong>Failed Test Report Log</strong></summary>${LOGS_BODY}\n${LOG_FOOTER}\n</details>"
  echo -e "${COMMENT_HEADER}${COMMENT_DETAILS}" > "$COMMENT_FILE"
  if ! gh pr comment "$PR_NUMBER" --body-file "$COMMENT_FILE"; then
    echo "::error::Failed to post comment to PR. The GitHub token may have expired or lack permissions."
  fi
  echo "::endgroup::"


  echo "::group::Generating JSON Artifact"
  # --- Write JSON Report File ---
  echo "$FAILED_CHECKS_JSON" | jq '.' > "$JSON_REPORT_FILE"
  echo "::notice::Generated failure report at ${JSON_REPORT_FILE}"
  echo "::endgroup::"
else
  echo "::warning::Job failed, but no specific test outcome was 'failure'. A step may have failed unexpectedly."
fi
