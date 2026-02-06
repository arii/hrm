#!/bin/bash
set -e

# Arguments
BASE_REF="$1"
PR_NUMBER="$2"

if [ -z "$BASE_REF" ] || [ -z "$PR_NUMBER" ]; then
  echo "::error::Usage: $0 <base_ref> <pr_number>"
  exit 1
fi

echo "::notice::Checking for file changes and last non-empty commit..."
echo "::notice::Base Ref: $BASE_REF, PR: $PR_NUMBER"

# Ensure we have the base branch
git fetch origin "$BASE_REF" --depth=100

MERGE_BASE=$(git merge-base HEAD "origin/$BASE_REF")
if [ -z "$MERGE_BASE" ]; then
  echo "::warning::Could not find a merge-base. Falling back to HEAD~1."
  MERGE_BASE=$(git rev-parse HEAD~1)
fi
echo "::notice::Merge base is at ${MERGE_BASE}"

if git diff --quiet "$MERGE_BASE" HEAD -- .; then
  echo "::notice::No file changes detected between HEAD and merge base. Searching PR history..."

  if [ -n "$GITHUB_OUTPUT" ]; then
    echo "has_changes=false" >> "$GITHUB_OUTPUT"
  else
    echo "has_changes=false"
  fi

  # Even if HEAD has no changes, we find the last non-empty commit to ensure that
  # downstream workflows (like gemini-review) have a valid commit SHA to analyze,
  # especially in cases of reverts or empty commits.
  echo "::notice::Fetching commit list from GitHub API for PR #${PR_NUMBER}..."

  # Ensure GITHUB_REPOSITORY is set, otherwise fail gracefully or rely on gh context
  REPO_ARG=""
  if [ -n "$GITHUB_REPOSITORY" ]; then
    REPO_ARG="repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/commits"
  else
    echo "::error::GITHUB_REPOSITORY environment variable is required."
    exit 1
  fi

  COMMIT_SHAS_JSON=$(gh api "$REPO_ARG" --jq '.[].sha' || true)

  if [ -z "$COMMIT_SHAS_JSON" ]; then
    echo "::error::Failed to fetch commits from GitHub API. Cannot determine last non-empty commit."
    HEAD_SHA=$(git rev-parse HEAD)
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "last_non_empty_commit=$HEAD_SHA" >> "$GITHUB_OUTPUT"
    else
        echo "last_non_empty_commit=$HEAD_SHA"
    fi
    exit 0
  fi

  mapfile -t COMMIT_SHAS < <(echo "$COMMIT_SHAS_JSON" | tac)

  LAST_NON_EMPTY_COMMIT=""
  for sha in "${COMMIT_SHAS[@]}"; do
    if ! git cat-file -e "$sha" &>/dev/null; then
      echo "::notice::Commit $sha not found locally, fetching..."
      git fetch origin "$sha" --depth=1
    fi

    if git cat-file -e "$sha^" &>/dev/null; then
      if ! git diff --quiet "$sha^" "$sha" -- .; then
        echo "::notice::Found last non-empty commit: $sha"
        LAST_NON_EMPTY_COMMIT=$sha
        break
      fi
    else
      if [ -n "$(git ls-tree --name-only -r "$sha")" ]; then
        echo "::notice::Found first commit in PR with files: $sha"
        LAST_NON_EMPTY_COMMIT=$sha
        break
      fi
    fi
  done

  if [ -z "$LAST_NON_EMPTY_COMMIT" ]; then
    echo "::warning::Could not find any non-empty commit in the PR history. Using HEAD as fallback."
    LAST_NON_EMPTY_COMMIT=$(git rev-parse HEAD)
  fi

  if [ -n "$GITHUB_OUTPUT" ]; then
    echo "last_non_empty_commit=${LAST_NON_EMPTY_COMMIT}" >> "$GITHUB_OUTPUT"
  else
    echo "last_non_empty_commit=${LAST_NON_EMPTY_COMMIT}"
  fi

else
  echo "::notice::File changes detected between HEAD and merge base."
  HEAD_SHA=$(git rev-parse HEAD)
  if [ -n "$GITHUB_OUTPUT" ]; then
    echo "has_changes=true" >> "$GITHUB_OUTPUT"
    echo "last_non_empty_commit=$HEAD_SHA" >> "$GITHUB_OUTPUT"
  else
    echo "has_changes=true"
    echo "last_non_empty_commit=$HEAD_SHA"
  fi
fi
