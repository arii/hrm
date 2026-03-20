#!/bin/bash
gh pr list --author "@me" --json headRefName,baseRefName --jq '.[] | "\(.headRefName) \(.baseRefName)"' | while read -r head base; do
    echo "Checking PR branch: $head (target: $base)"
    
    # 1. Force a clean state before switching
    git merge --abort > /dev/null 2>&1
    git reset --hard HEAD > /dev/null 2>&1
    
    # 2. Switch to the PR branch
    git checkout "$head" > /dev/null 2>&1
    
    # 3. Check if update is needed
    if git merge-base --is-ancestor "origin/$base" HEAD; then
        echo "  - Already up to date. Skipping."
    else
        echo "  - Merging changes from $base..."
        
        # 4. Attempt merge with 'theirs' strategy
        if git merge "origin/$base" --strategy-option theirs -m "Merge $base (theirs)"; then
            echo "  - Merge successful. Force pushing..."
            git push origin "$head" --force-with-lease
        else
            # 5. Handle edge-case conflicts (like file deletions) that -X theirs can't resolve
            echo "  - Standard merge failed. Forcing 'theirs' on all remaining conflicts..."
            git checkout --theirs .
            git add .
            git commit -m "Force resolve remaining conflicts using 'theirs'"
            git push origin "$head" --force-with-lease
        fi
    fi
done