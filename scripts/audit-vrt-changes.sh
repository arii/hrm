#!/bin/bash

# Configuration: Target specs, helpers, and snapshots
VRT_PATTERN="tests/playwright/.*spec\.ts|tests/playwright/lib/visual\.ts|tests/playwright/test-helpers\.ts"
OUTPUT_DIR="vrt-file-audits"

# Clean and recreate the output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Fetching open pull requests..."
prs=$(gh pr list --state open --json number,headRefName,title)

# Process each PR
echo "$prs" | jq -c '.[]' | while read -r pr; do
    pr_num=$(echo "$pr" | jq -r '.number')
    branch=$(echo "$pr" | jq -r '.headRefName')
    title=$(echo "$pr" | jq -r '.title')

    # Find changed files matching our pattern (excluding images)
    changed_files=$(gh pr diff "$pr_num" --name-only | grep -E "$VRT_PATTERN")

    for file_path in $changed_files; do
        # Create a safe filename based on the source file path
        # e.g., tests/playwright/vrt.spec.ts -> tests-playwright-vrt-spec-ts.md
        safe_name=$(echo "$file_path" | tr '/' '-' | tr '.' '-')
        audit_file="$OUTPUT_DIR/${safe_name}.md"

        # Initialize file with header if it doesn't exist
        if [ ! -f "$audit_file" ]; then
            {
                echo "# Cumulative Audit: \`$file_path\`"
                echo "This file tracks all pending PR changes affecting this specific test asset."
                echo ""
                echo "#### [[TODO]] Global Feedback"
                echo "- [ ] Reconcile conflicting \`maxDiffPixelRatio\` changes"
                echo "- [ ] Ensure consistent masking strategy across all PRs"
                echo ""
                echo "---"
            } > "$audit_file"
        fi

        # Append the PR-specific changes to this file
        {
            echo "## PR #$pr_num: $title"
            echo "**Branch:** \`$branch\`"
            echo ""
            echo "\`\`\`diff"
            # Use awk to extract the specific file hunk from the patch safely
            gh pr diff "$pr_num" --patch | awk -v path="$file_path" '
                $0 ~ "diff --git a/"path" " {hunk=1; print; next}
                $0 ~ "diff --git a/" {hunk=0}
                hunk {print}
            '
            echo "\`\`\`"
            echo ""
            echo "---"
        } >> "$audit_file"
        
        echo "   ✅ Logged PR #$pr_num changes to ${safe_name}.md"
    done
done

echo "🎉 File-based audit complete. View reports in /$OUTPUT_DIR"