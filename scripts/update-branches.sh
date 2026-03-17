#!/bin/bash

# Configuration
EXCLUDE_REGEX="^(gh-pages|leader|HEAD)$"

echo "Checking for mergeable open PRs to update..."

# 1. Fetch open PRs with their mergeable status and branch names
prs=$(gh pr list --state open --json number,mergeable,headRefName --limit 100 2>/dev/null)

if [ -z "$prs" ] || [ "$prs" == "[]" ]; then
    echo "No open Pull Requests found or GitHub CLI error."
    exit 0
fi

# 2. Iterate through PRs
echo "$prs" | jq -c '.[]' | while read -r pr; do
    number=$(echo "$pr" | jq -r '.number')
    mergeable=$(echo "$pr" | jq -r '.mergeable')
    branch_name=$(echo "$pr" | jq -r '.headRefName')

    # Skip excluded branches
    if [[ $branch_name =~ $EXCLUDE_REGEX ]]; then
        echo "Skipping excluded branch: $branch_name (PR #$number)"
        continue
    fi

    # Check if PR is mergeable (no conflicts)
    if [ "$mergeable" == "MERGEABLE" ]; then
        echo "Updating PR #$number ($branch_name)..."
        gh pr update-branch "$number"
    else
        echo "Skipping PR #$number ($branch_name) - Status: $mergeable"
    fi
done
