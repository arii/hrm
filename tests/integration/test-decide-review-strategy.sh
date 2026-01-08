#!/bin/bash
set -e

# Test runner for decide-review-strategy.sh

# A helper function to run a test case and capture output
run_test() {
  local test_name=$1
  local mock_json=$2
  shift 2

  echo "Running test: $test_name"

  local output_file
  output_file=$(mktemp)
  export GITHUB_OUTPUT=$output_file

  export MOCK_GH_COMMENTS_JSON=$mock_json
  export TEST_MODE=true

  unset NEEDS_REVIEW
  unset SKIP_REASON

  for var in "$@"; do
    export "$var"
  done

  # Execute the script, allowing it to exit without stopping the test runner
  bash ./scripts/decide-review-strategy.sh || true

  if [ -f "$output_file" ]; then
    while IFS='=' read -r key value; do
      case "$key" in
        needs-review) NEEDS_REVIEW="$value" ;;
        skip-reason) SKIP_REASON="$value" ;;
      esac
    done < "$output_file"
  fi

  rm "$output_file"
  unset GITHUB_OUTPUT MOCK_GH_COMMENTS_JSON TEST_MODE
}

# --- Test Cases ---

test_comment_limit_exceeded() {
  run_test "test_comment_limit_exceeded" \
    '{"comments":[{},{},{},{},{},{}]}' \
    "MAX_COMMENTS=5" \
    "PR_NUMBER=123" \
    "TRIGGER_EVENT=pull_request" \
    "PR_QUALITY_RESULT=success" # Set to success to avoid quality check block

  if [[ "$NEEDS_REVIEW" != "false" || "$SKIP_REASON" != "Exceeded comment limit of 5 comments" ]]; then
    echo "Assertion failed for test_comment_limit_exceeded!"
    echo "Expected: needs-review=false, skip-reason='Exceeded comment limit of 5 comments'"
    echo "Got: needs-review=$NEEDS_REVIEW, skip-reason='$SKIP_REASON'"
    exit 1
  fi
  echo "Test passed!"
}

test_throttling_active() {
  local recent_timestamp
  recent_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local mock_json
  mock_json=$(printf '{"comments":[{"author":{"login":"gemini-bot"},"createdAt":"%s"}]}' "$recent_timestamp")

  run_test "test_throttling_active" "$mock_json" \
    "MAX_COMMENTS=60" \
    "REVIEW_THROTTLE_MINUTES=30" \
    "BOT_USERNAME=gemini-bot" \
    "PR_NUMBER=123" \
    "TRIGGER_EVENT=pull_request" \
    "PR_QUALITY_RESULT=success"

  if [[ "$NEEDS_REVIEW" != "false" || ! "$SKIP_REASON" =~ "Last review was less than 30 minutes ago" ]]; then
    echo "Assertion failed for test_throttling_active!"
    echo "Expected: needs-review=false, skip-reason containing 'Last review was less than 30 minutes ago'"
    echo "Got: needs-review=$NEEDS_REVIEW, skip-reason='$SKIP_REASON'"
    exit 1
  fi
  echo "Test passed!"
}

test_manual_trigger_bypasses_limits() {
    run_test "test_manual_trigger_bypasses_limits" \
    '{}' \
    "MAX_COMMENTS=1" \
    "REVIEW_THROTTLE_MINUTES=1" \
    "PR_NUMBER=123" \
    "TRIGGER_EVENT=comment" \
    "COMMENT_BODY=@gemini-bot review"

  if [[ "$NEEDS_REVIEW" != "true" ]]; then
    echo "Assertion failed for test_manual_trigger_bypasses_limits!"
    echo "Expected: needs-review=true"
    echo "Got: needs-review=$NEEDS_REVIEW"
    exit 1
  fi
  echo "Test passed!"
}

# --- Runner ---
echo "Starting integration tests for decide-review-strategy.sh..."
test_comment_limit_exceeded
test_throttling_active
test_manual_trigger_bypasses_limits
echo "All tests passed!"
