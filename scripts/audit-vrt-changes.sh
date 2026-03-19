#!/bin/bash

for cmd in gh jq; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

VRT_PATTERN="tests/playwright/.*\.ts$"
OUTPUT_DIR="vrt-file-audits"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

prs=$(gh pr list --state open --json number,headRefName,title)

echo "$prs" | jq -c '.[]' | while read -r pr; do
    pr_num=$(echo "$pr" | jq -r '.number')
    branch=$(echo "$pr" | jq -r '.headRefName')
    title=$(echo "$pr" | jq -r '.title')

    changed_files=$(gh pr diff "$pr_num" --name-only | grep -E "$VRT_PATTERN" | grep -v "\.png$")

    if [ -n "$changed_files" ]; then
        audit_file="$OUTPUT_DIR/pr-${pr_num}.md"

        {
            echo "# PR #$pr_num: $title"
            echo "**Branch:** \`$branch\`"
            echo ""
            echo "#### [[TODO]] Global Feedback"
            echo "- [ ] Reconcile conflicting \`maxDiffPixelRatio\` changes"
            echo "- [ ] Ensure consistent masking strategy across all PRs"
            echo ""
            echo "---"
        } > "$audit_file"

        for file_path in $changed_files; do
            {
                echo "### \`$file_path\`"
                echo "\`\`\`diff"
                gh pr diff "$pr_num" --patch | awk -v path="$file_path" '
                    $0 ~ "diff --git a/"path" " {hunk=1; print; next}
                    $0 ~ "diff --git a/" {hunk=0}
                    hunk {print}
                '
                echo "\`\`\`"
                echo ""
            } >> "$audit_file"
        done
        
        echo "   ✅ Logged PR #$pr_num changes to pr-${pr_num}.md"
    fi
done

echo "🎉 File-based audit complete. View reports in /$OUTPUT_DIR"