#!/bin/bash

# ==============================================================================
# PR Conflict Detector
# Description: Identifies open Pull Requests with 'DIRTY' mergeable status.
# Requirements: GitHub CLI (gh) authenticated.
# ==============================================================================

#set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Fetching open Pull Requests and checking merge status...${NC}\n"

# Fetch open PRs with their mergeable status
# Statuses: MERGEABLE, CONFLICTING (Dirty), UNKNOWN
prs=$(gh pr list --state open --json number,title,headRefName,mergeable --limit 50)

# Parse JSON and filter for CONFLICTING (CONFLICTING in gh cli translates to 'DIRTY' or 'CONFLICTING' depending on version)
conflicted_prs=$(echo "$prs" | jq -c '.[] | select(.mergeable == "CONFLICTING" or .mergeable == "DIRTY")')

if [ -z "$conflicted_prs" ]; then
    echo -e "${GREEN}✓ No open Pull Requests have merge conflicts.${NC}"
    exit 0
fi

echo -e "${RED}Found conflicts in the following Pull Requests:${NC}"
echo "--------------------------------------------------------"

echo "$conflicted_prs" | while read -r pr; do
    number=$(echo "$pr" | jq -r '.number')
    title=$(echo "$pr" | jq -r '.title')
    branch=$(echo "$pr" | jq -r '.headRefName')
    
    echo -e "${YELLOW}PR #$number${NC}: $title"
    echo -e "   Branch: $branch"
    echo -e "   Action: gh pr checkout $number && git merge main\n"
done

echo "--------------------------------------------------------"
echo -e "${YELLOW}Total conflicted PRs: $(echo "$conflicted_prs" | wc -l)${NC}"

exit 1
