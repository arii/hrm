#!/bin/bash
# scripts/ci/github-utils.sh
# Utility functions for GitHub Actions workflows

# Retries a command up to a specified number of times if it returns a non-zero exit code.
# Usage: retry_command <max_attempts> <sleep_seconds> <command...>
retry_command() {
  local max_attempts=$1
  local sleep_seconds=$2
  shift 2
  local cmd=("$@")

  for i in $(seq 1 "$max_attempts"); do
    if [ "$i" -gt 1 ]; then
      echo "⏳ Attempt $i of $max_attempts failed with exit code $?. Retrying in ${sleep_seconds}s..." >&2
      sleep "$sleep_seconds"
    fi

    # Execute the command and capture output.
    # Success (exit code 0) returns immediately, even if output is empty.
    if result=$("${cmd[@]}"); then
      echo "$result"
      return 0
    fi
  done

  return 1
}
