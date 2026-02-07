#!/bin/bash
set -e

PR_NUMBER="$1"

if [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <pr_number>" >&2
  exit 1
fi

FILES=""
for i in {1..10}; do
  FILES=$(gh pr diff "$PR_NUMBER" --name-only 2>/dev/null || echo "")
  if [ -n "$FILES" ]; then break; fi
  echo "Waiting for GitHub API to index PR diff..." >&2
  sleep 5
done

if [ -z "$FILES" ]; then
  echo "::error::Could not retrieve PR diff. Indexing delay or empty PR." >&2
  exit 1
fi

echo "$FILES"
