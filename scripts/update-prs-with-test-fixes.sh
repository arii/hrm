#!/bin/bash
# Script to update all open PRs with test timeout fixes from leader branch
set -e

echo "🚀 Updating all open PRs with test timeout fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure we're on leader and up to date
print_status "Switching to leader branch and updating..."
git checkout leader
git pull origin leader

# Get list of all open PR branches (excluding our fix branch)
print_status "Getting list of open PR branches..."
BRANCHES=$(gh pr list --state open --json headRefName --jq '.[].headRefName' | grep -v "fix/test-json-errors" | grep -v "dependabot")

if [ -z "$BRANCHES" ]; then
    print_warning "No open PR branches found (excluding dependabot and our fix branch)"
    exit 0
fi

# Counter for tracking progress
TOTAL_BRANCHES=$(echo "$BRANCHES" | wc -l)
CURRENT=0
UPDATED=0
FAILED=0

print_status "Found $TOTAL_BRANCHES open PR branches to update"
echo ""

# Function to update a single branch
update_branch() {
    local BRANCH=$1
    CURRENT=$((CURRENT + 1))
    
    print_status "[$CURRENT/$TOTAL_BRANCHES] Updating branch: $BRANCH"
    
    # Check if remote branch exists
    if ! git ls-remote --heads origin $BRANCH | grep -q $BRANCH; then
        print_warning "  Remote branch $BRANCH does not exist, skipping..."
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    # Check if branch exists locally
    if ! git show-ref --verify --quiet refs/heads/$BRANCH; then
        print_status "  Creating local branch $BRANCH from remote"
        git checkout -b $BRANCH origin/$BRANCH || {
            print_error "  Failed to create local branch $BRANCH"
            return 1
        }
    else
        print_status "  Switching to existing branch $BRANCH"
        git checkout $BRANCH || {
            print_error "  Failed to checkout $BRANCH"
            return 1
        }
        
        # Update with latest from remote
        git pull origin $BRANCH || {
            print_warning "  Could not pull latest for $BRANCH, continuing..."
        }
    fi
    
    # Merge leader into the branch
    print_status "  Merging leader into $BRANCH..."
    if git merge leader --no-edit; then
        print_status "  Merge successful, pushing to remote..."
        if git push origin $BRANCH; then
            print_success "  ✅ Updated $BRANCH successfully"
            UPDATED=$((UPDATED + 1))
            return 0
        else
            print_error "  ❌ Failed to push $BRANCH"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        print_warning "  ⚠️  Merge conflicts in $BRANCH - requires manual resolution"
        git merge --abort
        print_warning "     Skipping $BRANCH - will need manual update"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Update each branch
for BRANCH in $BRANCHES; do
    update_branch $BRANCH
    echo ""
done

# Return to leader
git checkout leader

# Summary
echo "==================== SUMMARY ===================="
print_status "Total branches processed: $TOTAL_BRANCHES"
print_success "Successfully updated: $UPDATED"
print_error "Failed/Skipped: $FAILED"

if [ $FAILED -gt 0 ]; then
    echo ""
    print_warning "Branches that need manual attention:"
    print_warning "Run 'gh pr list --state open' to see which PRs might have conflicts"
    print_warning "For conflicted branches, manually run:"
    print_warning "  git checkout <branch>"
    print_warning "  git merge leader"
    print_warning "  # resolve conflicts"
    print_warning "  git push origin <branch>"
fi

echo ""
print_success "🎉 PR update process completed!"
print_status "All updated PRs now have the test timeout fixes and should pass tests"