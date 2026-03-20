#!/bin/bash

# Configuration
DAYS_OLD=1
EXCLUDE_REGEX="^(gh-pages|leader|HEAD)$"
REMOTE="origin"

git fetch --prune

CUTOFF=$(date -d "$DAYS_OLD days ago" +%s)

echo "Checking for branches older than $DAYS_OLD days with no open PRs..."

git for-each-ref --format='%(committerdate:unix) %(refname:short)' refs/remotes/$REMOTE/ | while read -r time ref; do
    branch_name="${ref#$REMOTE/}"

    if [[ $branch_name =~ $EXCLUDE_REGEX ]]; then
        continue
    fi

    if [ "$time" -lt "$CUTOFF" ]; then
        PR_COUNT=$(gh pr list --head "$branch_name" --state open --json number --jq 'length' 2>/dev/null || echo 0)

        if [ "${PR_COUNT:-0}" -eq 0 ]; then
            echo "Deleting stale branch: $branch_name"
            
            git push $REMOTE --delete "$branch_name"
            
            if git show-ref --verify --quiet "refs/heads/$branch_name"; then
                git branch -D "$branch_name"
            fi
        else
            echo "Skipping $branch_name (has an open PR)"
        fi
    fi
done
