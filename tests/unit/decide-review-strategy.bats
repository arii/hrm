#!/usr/bin/env bats

load 'test_helper.bash'

# Setup function to reset environment before each test
setup() {
  # Reset all environment variables to a clean slate
  unset TRIGGER_EVENT ACTION_TYPE COMMENT_BODY PR_NUMBER BASE_SHA HEAD_SHA \
        PR_QUALITY_RESULT MAX_COMMENTS REVIEW_THROTTLE_MINUTES BOT_USERNAME \
        QUALITY_GATE_BOT_USERNAMES MOCK_GH_COMMENTS_JSON MOCK_GH_FAIL
}

@test "should trigger review on manual override (comment)" {
  export TRIGGER_EVENT="comment"
  export ACTION_TYPE="created"
  export COMMENT_BODY="@gemini-bot review"
  export MAX_COMMENTS=0 # Prove that this check is bypassed

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should be case-insensitive for manual override (comment)" {
  export TRIGGER_EVENT="comment"
  export COMMENT_BODY="@Gemini-bot"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should trigger review safely when SHAs are missing during synchronization" {
  export TRIGGER_EVENT="pull_request"
  export ACTION_TYPE="synchronize"
  export BASE_SHA=""
  export HEAD_SHA=""

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should succeed on manual override even if SHAs are missing" {
  export TRIGGER_EVENT="comment"
  export COMMENT_BODY="@gemini-bot"
  export BASE_SHA=""
  export HEAD_SHA=""

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should trigger review on manual override (workflow_dispatch)" {
  export TRIGGER_EVENT="workflow_dispatch"
  export MAX_COMMENTS=0

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should trigger review on manual override (force_review)" {
  export FORCE_REVIEW="true"
  export MAX_COMMENTS=0

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should bypass GEMINI_ENABLE_PR_REVIEW on manual override" {
  export TRIGGER_EVENT="comment"
  export COMMENT_BODY="@gemini-bot"
  export GEMINI_ENABLE_PR_REVIEW="false"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should skip review when comment limit is exceeded" {
  export MAX_COMMENTS=1
  export MOCK_GH_COMMENTS_JSON='[{"body":"a"},{"body":"b"}]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "Exceeded comment limit of 1 comments"
}

@test "should skip review due to throttling" {
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  export MOCK_GH_COMMENTS_JSON="[{\"author\":{\"login\":\"test-bot\"},\"createdAt\":\"$now_iso\"}]"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "Last review was less than 30 minutes ago"
}

@test "should trigger review when PR is opened" {
  export TRIGGER_EVENT="pull_request"
  export ACTION_TYPE="opened"
  export MOCK_GH_COMMENTS_JSON='[]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should proceed with review when throttling period has passed" {
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"test-bot"},"createdAt":"2023-01-01T12:00:00Z"}]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should trigger review on quality check failure" {
  export PR_QUALITY_RESULT="failure"
  export QUALITY_GATE_BOT_USERNAMES="github-actions[bot]"
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"github-actions[bot]"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should trigger review on failure from any of multiple bot usernames" {
  export PR_QUALITY_RESULT="failure"
  export QUALITY_GATE_BOT_USERNAMES="bot1 bot2"
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"bot2"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
}

@test "should not trigger review when bot list is empty" {
  export PR_QUALITY_RESULT="failure"
  export QUALITY_GATE_BOT_USERNAMES=""
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"any-bot"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "quality failure with no detailed report (likely static analysis)"
}

@test "should skip review when GEMINI_ENABLE_PR_REVIEW is false" {
  export GEMINI_ENABLE_PR_REVIEW="false"
  export TRIGGER_EVENT="pull_request"
  export ACTION_TYPE="opened"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "Gemini review is disabled"
}

@test "should fail-closed with reason if API fails for automated review" {
  export MOCK_GH_FAIL="true"
  export TRIGGER_EVENT="pull_request"
  export ACTION_TYPE="opened"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "GitHub API failure (Exit Code: 1)"
}

# Helper function to assert the output of the script
assert_output() {
  local key="$1"
  local expected_value="$2"
  local actual_value
  actual_value=$(grep "$key=" "$GITHUB_OUTPUT" | cut -d'=' -f2)

  if [ "$actual_value" != "$expected_value" ]; then
    echo "Assertion failed for key '$key'"
    echo "Expected: '$expected_value'"
    echo "Actual:   '$actual_value'"
    return 1
  fi
}
