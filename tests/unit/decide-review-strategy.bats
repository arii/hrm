#!/usr/bin/env bats

load 'test_helper.bash'

@test "should trigger review on failure from any of multiple bot usernames" {
  # Setup: Mock a quality check failure from a secondary bot username
  export PR_QUALITY_RESULT="failure"
  export QUALITY_GATE_BOT_USERNAMES="bot1 bot2"
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"bot2"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

  # Run the script
  run_script

  # Assert: The script should decide a review is needed
  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
}

@test "should not trigger review when bot list is empty" {
  # Setup: Mock a quality check failure but with an empty bot list
  export PR_QUALITY_RESULT="failure"
  export QUALITY_GATE_BOT_USERNAMES=""
  export MOCK_GH_COMMENTS_JSON='[{"author":{"login":"any-bot"}, "body": "Quality Gate Results... Unit Tests ❌"}]'

  # Run the script
  run_script

  # Assert: The script should not find a matching comment and thus not trigger a review
  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "quality failure with no detailed report (likely static analysis)"
}

# Helper function to assert the output of the script
assert_output() {
  local key="$1"
  local expected_value="$2"
  local actual_value
  actual_value=$(grep "$key=" "$GITHUB_OUTPUT" | cut -d'=' -f2)
  [ "$actual_value" == "$expected_value" ]
}
