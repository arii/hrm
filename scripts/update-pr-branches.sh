#! /bin/bash

gh pr list --author "@me" --json headRefName,baseRefName --jq '.[] | "\(.headRefName) \(.baseRefName)"' | while read -r head base; do
    echo "Checking PR branch: $head (target: $base)"
    
    git merge --abort > /dev/null 2>&1
    git reset --hard HEAD > /dev/null 2>&1
    git checkout "$head" > /dev/null 2>&1
    
    if git merge-base --is-ancestor "origin/$base" HEAD; then
        echo "  - Already up to date. Skipping."
    else
        echo "  - Merging changes from $base..."
        
        if git merge "origin/$base" --strategy-option theirs -m "Merge $base (theirs)"; then
            echo "  - Merge successful. Force pushing..."
            git push origin "$head" --force-with-lease
        else
            echo "  - Conflict detected (likely Modify/Delete). Forcing snapshot match..."
            
            # 1. Resolve deleted files: If it's gone in 'leader', delete it in the PR
            git diff --name-only --diff-filter=U | xargs -I {} sh -c 'git show "origin/'$base'":{} >/dev/null 2>&1 || git rm {}'
            
            # 2. Resolve modified files: Take the version from 'leader'
            git checkout "origin/$base" -- .
            
            # 3. Finalize and push
            git add .
            git commit -m "Force match snapshot of $base"
            git push origin "$head" --force-with-lease
            echo "  - Fixed and pushed $head."
        fi
    fi
done
