#!/usr/bin/env bats

load 'test_helper.bash'

# Setup function to reset environment before each test
setup() {
  # Reset all environment variables to a clean slate
  unset TRIGGER_EVENT ACTION_TYPE COMMENT_BODY PR_NUMBER BASE_SHA HEAD_SHA \
        PR_QUALITY_RESULT MAX_COMMENTS REVIEW_THROTTLE_MINUTES BOT_USERNAME \
        QUALITY_GATE_BOT_USERNAMES MOCK_GH_COMMENTS_JSON \
        MOCK_GIT_DIFF_TREE_EMPTY

  # Mock git using a temporary executable
  MOCK_BIN_DIR=$(mktemp -d)
  export PATH="$MOCK_BIN_DIR:$PATH"

  cat <<'EOF' > "$MOCK_BIN_DIR/git"
#!/bin/bash
# Check the first argument. Since arguments are shifted, flags like -r or -m might be $1, $2 etc.
# We are looking for the subcommand "diff-tree", "diff", etc.
# But git command structure is `git [flags] subcommand [args]` or `git subcommand [flags] [args]`.
# The script calls: `git diff-tree --no-commit-id --name-only -r -m "$HEAD_SHA"`
# So "diff-tree" is the first argument to the wrapper script.

# Simple argument parsing to find the subcommand
SUBCOMMAND=""
for arg in "$@"; do
  if [[ "$arg" == "diff-tree" ]]; then
    SUBCOMMAND="diff-tree"
    break
  elif [[ "$arg" == "diff" ]]; then
    SUBCOMMAND="diff"
    break
  elif [[ "$arg" == "cat-file" ]]; then
    SUBCOMMAND="cat-file"
    break
  fi
done

if [[ "$SUBCOMMAND" == "diff-tree" ]]; then
  if [[ "$MOCK_GIT_DIFF_TREE_EMPTY" == "true" ]]; then
    # Return nothing (0 lines) for empty commit
    exit 0
  else
    # Return a dummy file so existing tests pass (simulate changes)
    echo "mock_changed_file.txt"
  fi
elif [[ "$SUBCOMMAND" == "diff" ]]; then
  # For check_substantive: simulate substantive changes by default
  echo "some_file.ts"
elif [[ "$SUBCOMMAND" == "cat-file" ]]; then
  # Simulate commit exists
  exit 0
else
  # Fail on unexpected commands to ensure test robustness
  echo "Error: Unexpected git command or argument: $@" >&2
  exit 1
fi
EOF
  chmod +x "$MOCK_BIN_DIR/git"
}

teardown() {
  rm -rf "$MOCK_BIN_DIR"
  rm -f "$GITHUB_OUTPUT"
}

@test "should trigger review on manual override" {
  export TRIGGER_EVENT="comment"
  export ACTION_TYPE="created"
  export COMMENT_BODY="@gemini-bot review"
  export MAX_COMMENTS=0 # Prove that this check is bypassed

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "true"
  assert_output "skip-reason" ""
}

@test "should skip review if triggering commit is empty" {
  export MOCK_GIT_DIFF_TREE_EMPTY="true"

  run_script

  [ "$status" -eq 0 ]
  assert_output "needs-review" "false"
  assert_output "skip-reason" "triggering commit has no file changes"
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
