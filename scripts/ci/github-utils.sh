#!/bin/bash
# scripts/ci/github-utils.sh
# Utility functions for GitHub Actions workflows

# Retries a command up to a specified number of times with a sleep interval
# Usage: retry_command <max_attempts> <sleep_seconds> <command...>
retry_command() {
  local max_attempts=$1
  local sleep_seconds=$2
  shift 2
  local cmd=("$@")

  for i in $(seq 1 "$max_attempts"); do
    if [ "$i" -gt 1 ]; then
      echo "⏳ Attempt $i of $max_attempts failed. Retrying in ${sleep_seconds}s..." >&2
      sleep "$sleep_seconds"
    fi

    # Execute the command and capture output.
    # Error messages are now allowed to flow to stderr for better debuggability in CI.
    if result=$("${cmd[@]}"); then
      # We succeed if we have a non-empty result.
      # If result is empty, it usually means the data is not yet available or indexed.
      if [ -n "$result" ]; then
        echo "$result"
        return 0
      fi
    fi
  done

  return 1
}
