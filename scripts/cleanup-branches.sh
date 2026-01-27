#!/bin/bash

# Configuration
DAYS_OLD=1
EXCLUDE_REGEX="^(gh-pages|leader|HEAD)$"
REMOTE="origin"

# 1. Update references and prune tracking branches that no longer exist on remote
git fetch --prune

# Calculate cutoff timestamp
CUTOFF=$(date -d "$DAYS_OLD days ago" +%s)
# Note: On macOS, use: CUTOFF=$(date -v-${DAYS_OLD}d +%s)

echo "Checking for branches older than $DAYS_OLD days with no open PRs..."

# 2. Iterate through remote branches
git for-each-ref --format='%(committerdate:unix) %(refname:short)' refs/remotes/$REMOTE/ | while read -r time ref; do
    branch_name="${ref#$REMOTE/}"

    # Skip excluded branches
    if [[ $branch_name =~ $EXCLUDE_REGEX ]]; then
        continue
    fi

    # Check if branch is older than the cutoff
    if [ "$time" -lt "$CUTOFF" ]; then

        # Check for open Pull Requests using GitHub CLI
        PR_COUNT=$(gh pr list --head "$branch_name" --state open --json number --jq 'length' 2>/dev/null)

        # If PR_COUNT is 0 (or command fails, assuming no PR), proceed with deletion
        if [ "$PR_COUNT" -eq 0 ] || [ -z "$PR_COUNT" ]; then
            echo "Deleting stale branch: $branch_name"

            # Delete from remote
            git push $REMOTE --delete "$branch_name"

            # Delete local branch if it exists
            if git show-ref --verify --quiet "refs/heads/$branch_name"; then
                git branch -D "$branch_name"
            fi
        else
            echo "Skipping $branch_name (has an open PR)"
        fi
    fi
done
