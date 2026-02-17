#!/usr/bin/env bats

load 'test_helper.bash'

# Source the script to test its functions
setup() {
  source scripts/ci/github-utils.sh
}

# --- Mocking 'gh' command ---
# We override the helper's mock to be more specific for this test suite
gh() {
  local args="$*"

  # Mock 'gh pr view'
  if [[ "$args" == *"pr view"* ]]; then
      # Return valid JSON with metadata
      # files: 2, additions: 10, deletions: 5
      echo '{"additions": 10, "deletions": 5, "changedFiles": 2, "files": [{"path":"file1.txt"},{"path":"file2.txt"}]}'
      return 0
  fi

  # Mock 'gh pr diff'
  if [[ "$args" == *"pr diff"* ]]; then
      # Helper check for numstat support
      if [[ "$args" == *"--help"* ]]; then
          if [[ "$MOCK_GH_SUPPORTS_NUMSTAT" == "true" ]]; then
              echo "--numstat   Display number of lines changed"
          else
              echo "--name-only   Display only names of changed files"
          fi
          return 0
      fi

      # Simulate --numstat usage
      if [[ "$args" == *"--numstat"* ]]; then
          if [[ "$MOCK_GH_SUPPORTS_NUMSTAT" == "true" ]]; then
              # Output format: additions deletions path
              echo -e "7\t3\tfile1.txt"
              echo -e "3\t2\tfile2.txt"
              return 0
          else
              echo "unknown flag: --numstat" >&2
              return 1
          fi
      fi

      # Simulate --name-only usage
      if [[ "$args" == *"--name-only"* ]]; then
          echo "file1.txt"
          echo "file2.txt"
          return 0
      fi
  fi

  echo "Unknown command or flag in mock: gh $args" >&2
  return 127
}
export -f gh

@test "poll_pr_metrics: uses --numstat when supported" {
  export MOCK_GH_SUPPORTS_NUMSTAT="true"

  run poll_pr_metrics 123 1 0

  [ "$status" -eq 0 ]
  # Should use source: diff
  [[ "$output" == *"\"source\": \"diff\""* ]]
  # Should have calculated counts from numstat (7+3=10, 3+2=5)
  [[ "$output" == *"\"additions\": 10"* ]]
  [[ "$output" == *"\"deletions\": 5"* ]]
  [[ "$output" == *"\"file_count\": 2"* ]]
}

@test "poll_pr_metrics: falls back to --name-only when --numstat is unsupported" {
  export MOCK_GH_SUPPORTS_NUMSTAT="false"

  run poll_pr_metrics 123 1 0

  [ "$status" -eq 0 ]
  # Should use source: diff (even with fallback, we still get file list from diff)
  [[ "$output" == *"\"source\": \"diff\""* ]]
  # Should use metadata counts (additions: 10, deletions: 5 from gh pr view mock)
  [[ "$output" == *"\"additions\": 10"* ]]
  [[ "$output" == *"\"deletions\": 5"* ]]
  [[ "$output" == *"\"file_count\": 2"* ]]

  # Ensure we didn't see the "unknown flag" error in stderr (bats captures mixed output in $output, but we can check if it failed gracefully)
  [[ "$output" != *"unknown flag: --numstat"* ]]
}

@test "poll_pr_metrics: handles empty diff gracefully by falling back to metadata" {
  # We redefine the gh mock within this test case.
  # Note: bats functions are executed in subshells, so exporting the function is crucial.

  function gh() {
    local args="$*"
    if [[ "$args" == *"pr view"* ]]; then
       # Metadata says 0 changes
       echo '{"additions": 0, "deletions": 0, "changedFiles": 0, "files": []}'
       return 0
    fi
    # Mock ANY 'gh pr diff' call to return empty string
    if [[ "$args" == *"pr diff"* ]]; then
       echo ""
       return 0
    fi
  }
  export -f gh

  run poll_pr_metrics 123 1 0

  # It should return 0 because it falls back to metadata eventually
  [ "$status" -eq 0 ]
  [[ "$output" == *"Both metadata and diff report 0 changes"* ]]
  [[ "$output" == *"Metrics polling timed out. Falling back to API metadata."* ]]
  [[ "$output" == *"\"source\": \"metadata\""* ]]
  [[ "$output" == *"\"file_count\": 0"* ]]
}
