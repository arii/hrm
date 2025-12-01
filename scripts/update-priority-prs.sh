#!/bin/bash
# Quick script to update high-priority feature PRs first
set -e

echo "🎯 Updating HIGH-PRIORITY PRs with test fixes..."

# High-priority branches that should be updated first
HIGH_PRIORITY_BRANCHES=(
    "feat/websocket-command-relay"
    "feature/websocket-reconnect-2-1" 
    "feat/api-validation-zod"
    "feat/mobile-ux-improvements-1"
    "feat/rate-limiting"
    "feat/secure-debug-endpoints"
    "feat/health-checks"
    "refactor/spotify-service-singleton"
    "quick-win/dry-fail-fast-fixes"
    "feat/consolidate-volume-hook"
)

# Ensure we're on leader 
git checkout leader
git pull origin leader

echo "Updating ${#HIGH_PRIORITY_BRANCHES[@]} high-priority branches..."

for BRANCH in "${HIGH_PRIORITY_BRANCHES[@]}"; do
    echo "🔄 Updating $BRANCH..."
    
    if gh pr view $BRANCH --json state -q '.state' | grep -q "OPEN"; then
        git checkout $BRANCH || git checkout -b $BRANCH origin/$BRANCH
        git pull origin $BRANCH || echo "Could not pull latest"
        
        if git merge leader --no-edit; then
            git push origin $BRANCH
            echo "✅ Updated $BRANCH"
        else
            echo "⚠️  Conflicts in $BRANCH - skipping"
            git merge --abort
        fi
    else
        echo "ℹ️  $BRANCH is not open, skipping"
    fi
done

git checkout leader
echo "🎉 High-priority PRs updated!"