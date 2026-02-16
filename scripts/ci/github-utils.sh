#!/bin/bash
# scripts/ci/github-utils.sh
# Utility functions for GitHub Actions workflows

# Retries a command up to a specified number of times if it returns a non-zero exit code.
# Status messages and command stderr are redirected to stderr to keep stdout clean.
# Usage: retry_command <max_attempts> <sleep_seconds> <command...>
retry_command() {
  local max_attempts=$1
  local sleep_seconds=$2
  shift 2
  local cmd=("$@")

  for i in $(seq 1 "$max_attempts"); do
    # Execute the command and capture output.
    # Success (exit code 0) returns immediately.
    if result=$("${cmd[@]}"); then
      echo "$result"
      return 0
    fi

    local exit_code=$?
    if [ "$i" -lt "$max_attempts" ]; then
      echo "⏳ Attempt $i of $max_attempts failed with exit code $exit_code. Retrying in ${sleep_seconds}s..." >&2
      sleep "$sleep_seconds"
    fi
  done

  return 1
}

# Polls for PR metadata until a validation condition is met.
# Usage: poll_pr_view <pr_number> <max_attempts> <sleep_seconds> <fields> <jq_filter> <validation_jq_check>
poll_pr_view() {
  local pr_number=$1
  local max_attempts=$2
  local sleep_seconds=$3
  local fields=$4
  local jq_filter=$5
  local validation_jq_check=$6

  for i in $(seq 1 "$max_attempts"); do
    echo "📊 Polling PR $pr_number metadata (Attempt $i/$max_attempts)..." >&2

    local data
    data=$(retry_command 3 2 gh pr view "$pr_number" --json "$fields" --jq "$jq_filter")

    if [ -n "$data" ]; then
      if [ -n "$validation_jq_check" ]; then
        if echo "$data" | jq -e "$validation_jq_check" >/dev/null 2>&1; then
          echo "$data"
          return 0
        fi
      else
        echo "$data"
        return 0
      fi
    fi

    if [ "$i" -lt "$max_attempts" ]; then
      echo "⏳ Metadata incomplete or validation failed. Retrying in ${sleep_seconds}s..." >&2
      sleep "$sleep_seconds"
    fi
  done

  return 1
}

# Polls for PR metrics (files, additions, deletions) until diff is available or timeout.
# Usage: poll_pr_metrics <pr_number> <max_attempts> <sleep_seconds>
poll_pr_metrics() {
  local pr_number=$1
  local max_attempts=$2
  local sleep_seconds=$3

  local metadata=""

  for i in $(seq 1 "$max_attempts"); do
    echo "📊 Gathering PR metrics for $pr_number (Attempt $i/$max_attempts)..." >&2

    # 1. Fetch metadata baseline
    metadata=$(retry_command 2 1 gh pr view "$pr_number" --json additions,deletions,changedFiles)

    if [ -n "$metadata" ]; then
      local meta_count=$(echo "$metadata" | jq -r '.changedFiles // 0')
      local meta_add=$(echo "$metadata" | jq -r '.additions // 0')
      local meta_del=$(echo "$metadata" | jq -r '.deletions // 0')

      echo "   Current Metadata: Files=$meta_count, Additions=$meta_add, Deletions=$meta_del" >&2

      # 2. Fetch live file list from diff
      local files
      files=$(retry_command 2 1 gh pr diff "$pr_number" --name-only)
      local count=$(echo "$files" | grep -c . || echo "0")

      echo "   Current Diff: Files=$count" >&2

      if [ "$count" -gt 0 ]; then
        # 3. Fetch numstat for precise counts if diff is available
        local numstat
        numstat=$(retry_command 2 1 gh pr diff "$pr_number" --numstat)
        local add=$meta_add
        local del=$meta_del
        if [ -n "$numstat" ]; then
          # Use awk for efficient sum of columns
          add=$(echo "$numstat" | awk '{sum+=$1} END {print sum+0}')
          del=$(echo "$numstat" | awk '{sum+=$2} END {print sum+0}')
        fi

        # Return as JSON for easy consumption
        jq -n --arg count "$count" --arg add "$add" --arg del "$del" --arg files "$files" \
          '{file_count: ($count|tonumber), additions: ($add|tonumber), deletions: ($del|tonumber), files: $files, source: "diff"}'
        return 0
      elif [ "$meta_count" -gt 0 ]; then
        echo "⏳ Metadata indicates changes, but diff is empty. Waiting for indexing..." >&2
      else
        echo "❓ Both metadata and diff report 0 changes." >&2
      fi
    fi

    if [ "$i" -lt "$max_attempts" ]; then
      sleep "$sleep_seconds"
    fi
  done

  # Final Fallback to metadata if diff polling failed
  if [ -n "$metadata" ]; then
     echo "⚠️ Metrics polling timed out. Falling back to API metadata." >&2
     local meta_count=$(echo "$metadata" | jq -r '.changedFiles // 0')
     local meta_add=$(echo "$metadata" | jq -r '.additions // 0')
     local meta_del=$(echo "$metadata" | jq -r '.deletions // 0')
     jq -n --arg count "$meta_count" --arg add "$meta_add" --arg del "$meta_del" --arg files "" \
       '{file_count: ($count|tonumber), additions: ($add|tonumber), deletions: ($del|tonumber), files: $files, source: "metadata", fallback: true}'
     return 0
  fi

  return 1
}
