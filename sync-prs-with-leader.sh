#!/bin/bash

# ==============================================================================
# PR Force-Sync Script
# Description: Force-syncs all open PR branches with origin/leader, 
#              committing conflicts if they occur.
# WARNING: This is a DESTRUCTIVE operation. It force-pushes to PR branches.
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Confirmation prompt
echo -e "${RED}⚠️  WARNING: DESTRUCTIVE OPERATION${NC}"
echo -e "This script will force-sync all open PR branches with origin/leader."
echo -e "It will rewrite history on remote branches and commit conflict markers if necessary."
echo -e "${YELLOW}Ensure you have no uncommitted changes in your current branch before proceeding.${NC}"
read -p "Are you sure you want to proceed? (y/N) " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please stash or commit them first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Fetching open Pull Requests...${NC}"

# Get list of open PRs
# Format: "number headRefName"
prs=$(gh pr list --state open --json number,headRefName --jq '.[] | "\(.number) \(.headRefName)"')

if [ -z "$prs" ]; then
    echo -e "${GREEN}No open Pull Requests found.${NC}"
    exit 0
fi

# Store the current branch to return to it later
initial_branch=$(git rev-parse --abbrev-ref HEAD)

# Use a temporary file to store PR list to avoid subshell issues with while read
pr_list_file=$(mktemp)
echo "$prs" > "$pr_list_file"

while read -r num branch; do
    echo -e "\n${YELLOW}--------------------------------------------------------${NC}"
    echo -e "${YELLOW}Processing PR #$num (Branch: $branch)...${NC}"
    
    # Fetch updates
    echo "Fetching origin leader and $branch..."
    if ! git fetch origin leader "$branch" 2>/dev/null; then
        echo -e "${RED}Failed to fetch origin leader or $branch. Skipping.${NC}"
        continue
    fi
    
    # Checkout branch
    # If branch doesn't exist locally, it will be created from origin/$branch because of the fetch
    if ! git checkout "$branch" 2>/dev/null; then
        echo -e "${RED}Failed to checkout $branch. Skipping.${NC}"
        continue
    fi
    
    # Hard reset to match remote
    echo "Resetting $branch to origin/$branch..."
    if ! git reset --hard "origin/$branch"; then
        echo -e "${RED}Failed to reset to origin/$branch. Skipping.${NC}"
        continue
    fi
    
    # Attempt to merge leader
    echo "Merging origin/leader into $branch..."
    if git merge origin/leader --no-edit; then
        echo -e "${GREEN}Cleanly merged origin/leader into $branch.${NC}"
    else
        echo -e "${YELLOW}Conflicts detected. Committing with conflict markers...${NC}"
        git add .
        if git commit --no-verify -m "Merge origin/leader with conflicts"; then
             echo -e "${YELLOW}Committed conflicts to $branch.${NC}"
        else
             echo -e "${RED}Failed to commit conflicts. Skipping push.${NC}"
             continue
        fi
    fi
    
    # Force push
    echo "Force-pushing updated $branch to origin..."
    if git push origin "$branch" --force; then
        echo -e "${GREEN}Successfully force-synced PR #$num.${NC}"
    else
        echo -e "${RED}Failed to force-push $branch.${NC}"
    fi
done < "$pr_list_file"

rm "$pr_list_file"

# Return to initial branch
echo -e "\n${YELLOW}Returning to initial branch: $initial_branch${NC}"
git checkout "$initial_branch"

echo -e "\n${GREEN}Force-sync operation complete.${NC}"
