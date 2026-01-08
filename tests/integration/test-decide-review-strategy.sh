#!/bin/bash
# =================================================================================================
#
# Integration Test Suite for decide-review-strategy.sh
#
# This script tests the complete logic of the review decision script. It uses a mock-based
# approach by overriding the `gh` command with a function that returns controlled, fake JSON
# data. This allows for testing all logic paths—throttling, comment limits, manual overrides,
# and code change analysis—without making live GitHub API calls.
#
# --- How it Works ---
# 1. Mocking: A `gh()` function is defined to intercept calls made by the script. It intelligently
#    handles the `--jq` and `-q` flags, applying the filter to mock data if present, thus
#    accurately simulating the real `gh` CLI.
# 2. Test Cases: Each test first calls `reset_env` to ensure a clean state, then sets up
#    specific environment variables for the scenario and executes the script.
# 3. Assertions: The test then checks the output file (`mock_github_output`) to verify that
#    the script produced the expected `needs-review` and `skip-reason` values.
#
# =================================================================================================

set -e

# --- Test Setup ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_UNDER_TEST="$SCRIPT_DIR/../../scripts/decide-review-strategy.sh"
MOCK_GITHUB_OUTPUT=$(mktemp)

cleanup() {
  rm -f "$MOCK_GITHUB_OUTPUT"
}
trap cleanup EXIT

# --- Mock Implementation ---
#
# This function overrides the real `gh` command. It parses the arguments to find if `--jq` or its
# shorthand `-q` is used. If so, it applies the provided filter to the mock JSON. Otherwise,
# it returns the full JSON object.
gh() {
    local args=("$@")
    local jq_filter=""

    # Find the --jq or -q filter in the arguments list.
    for i in "${!args[@]}"; do
        if [[ "${args[$i]}" == "--jq" || "${args[$i]}" == "-q" ]]; then
            jq_filter="${args[$i+1]}"
            break
        fi
    done

    # The base JSON data we are mocking, structured as the real `gh` command would return it.
    local full_json="{\"comments\": ${MOCK_GH_COMMENTS_JSON:-[]}}"

    # If a jq filter was provided in the command, apply it.
    if [[ -n "$jq_filter" ]]; then
        # The `-r` flag removes quotes from string output, matching `gh` behavior.
        echo "$full_json" | jq -r "$jq_filter"
    else
        # Otherwise, return the entire JSON object.
        echo "$full_json"
    fi
}
export -f gh


# --- Test Utilities ---

# Resets all environment variables to a clean state before each test to ensure isolation.
reset_env() {
    unset TRIGGER_EVENT ACTION_TYPE COMMENT_BODY PR_NUMBER BASE_SHA HEAD_SHA \
          PR_QUALITY_RESULT MAX_COMMENTS REVIEW_THROTTLE_MINUTES BOT_USERNAME MOCK_GH_COMMENTS_JSON
}

# Executes the script under test with the environment variables set by the test case.
run_test() {
  > "$MOCK_GITHUB_OUTPUT"
  (
    # Set sensible defaults for variables that must exist but may not be relevant to every test.
    # Each test can override these as needed.
    export GITHUB_OUTPUT="$MOCK_GITHUB_OUTPUT"
    export TRIGGER_EVENT="${TRIGGER_EVENT:-pull_request}"
    export ACTION_TYPE="${ACTION_TYPE:-synchronize}"
    export COMMENT_BODY="${COMMENT_BODY:-}"
    export PR_NUMBER="${PR_NUMBER:-123}"
    export BASE_SHA="${BASE_SHA:-base}"
    export HEAD_SHA="${HEAD_SHA:-head}"
    export PR_QUALITY_RESULT="${PR_QUALITY_RESULT:-success}"
    export MAX_COMMENTS="${MAX_COMMENTS:-60}"
    export REVIEW_THROTTLE_MINUTES="${REVIEW_THROTTLE_MINUTES:-30}"
    export BOT_USERNAME="${BOT_USERNAME:-test-bot}"
    export MOCK_GH_COMMENTS_JSON="${MOCK_GH_COMMENTS_JSON:-[]}"

    bash "$SCRIPT_UNDER_TEST"
  )
}

# Asserts the output of the script against expected values.
assert_output() {
  local expected_needs_review="$1"
  local expected_skip_reason="$2"
  local message="$3"

  local actual_needs_review
  actual_needs_review=$(grep "needs-review=" "$MOCK_GITHUB_OUTPUT" | cut -d'=' -f2)
  local actual_skip_reason
  actual_skip_reason=$(grep "skip-reason=" "$MOCK_GITHUB_OUTPUT" | cut -d'=' -f2)

  if [[ "$actual_needs_review" == "$expected_needs_review" && "$actual_skip_reason" == "$expected_skip_reason" ]]; then
    echo "✅ PASS: $message"
  else
    echo "❌ FAIL: $message"
    echo "  Expected: needs-review=$expected_needs_review, skip-reason='$expected_skip_reason'"
    echo "  Actual:   needs-review=$actual_needs_review, skip-reason='$actual_skip_reason'"
    exit 1
  fi
}

# --- Test Cases ---

test_manual_override_triggers_review() {
  echo -e "\n--- Running Test: Manual override triggers review ---"
  reset_env
  TRIGGER_EVENT="comment"
  ACTION_TYPE="created" # Must be set to satisfy the script's guard clause.
  COMMENT_BODY="@gemini-bot review"
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  MOCK_GH_COMMENTS_JSON="[{\"author\":{\"login\":\"test-bot\"},\"createdAt\":\"$now_iso\"}]"
  MAX_COMMENTS=0 # Set an impossible limit to prove it's bypassed.

  run_test
  assert_output "true" "" "Should trigger review on manual comment override."
}

test_skip_on_comment_limit() {
  echo -e "\n--- Running Test: Skip on comment limit ---"
  reset_env
  MAX_COMMENTS=1
  MOCK_GH_COMMENTS_JSON='[{"body":"a"},{"body":"b"}]'

  run_test
  assert_output "false" "Exceeded comment limit of 1 comments" "Should skip when comment count exceeds limit."
}

test_skip_on_throttling() {
  echo -e "\n--- Running Test: Skip on throttling ---"
  reset_env
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  MOCK_GH_COMMENTS_JSON="[{\"author\":{\"login\":\"test-bot\"},\"createdAt\":\"$now_iso\"}]"

  run_test
  assert_output "false" "Last review was less than 30 minutes ago" "Should skip when a recent bot comment exists."
}

test_proceed_on_pr_opened() {
  echo -e "\n--- Running Test: Proceed on PR opened ---"
  reset_env
  TRIGGER_EVENT="pull_request"
  ACTION_TYPE="opened"
  MOCK_GH_COMMENTS_JSON='[]'

  run_test
  assert_output "true" "" "Should always review when a PR is first opened."
}

test_proceed_when_throttling_period_passed() {
  echo -e "\n--- Running Test: Proceed when throttling period has passed ---"
  reset_env
  # This comment is old, so it should pass the throttle check.
  MOCK_GH_COMMENTS_JSON='[{"author":{"login":"test-bot"},"createdAt":"2023-01-01T12:00:00Z"}]'

  run_test
  # Because a previous bot comment exists, the script falls through to the re-review logic.
  # In a test environment with no git history, this logic decides a new review is needed.
  # This proves the throttling check was successfully bypassed.
  assert_output "true" "" "Should proceed when throttle period has passed."
}

test_quality_check_failure_triggers_review() {
    echo -e "\n--- Running Test: Quality check failure triggers review ---"
    reset_env
    PR_QUALITY_RESULT="failure"
    # Mock a quality report comment indicating a test failure.
    MOCK_GH_COMMENTS_JSON='[{"author":{"login":"test-bot"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

    run_test
    assert_output "true" "" "Should trigger review on test failures."
}

# --- Main Execution ---

test_manual_override_triggers_review
test_skip_on_comment_limit
test_skip_on_throttling
test_proceed_on_pr_opened
test_proceed_when_throttling_period_passed
test_quality_check_failure_triggers_review

echo -e "\n🎉 All tests passed successfully!"
