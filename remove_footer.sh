#!/bin/bash
for file in "$@"; do
    # Use perl to easily match multi-line strings
    perl -0777 -pi -e 's/(\\n\\n)?---\\n#### 🤖 Gemini Manual Trigger Quick Reference\\n\| Command \| Action \|\\n\| :--- \| :--- \|\\n\| `\@gemini-bot` \| Run AI Code Review \(PR only\) \|\\n\| `\@gemini-triage` \| Run Issue Triage \|\\n\| `\@gemini-coder <task>` \| Generate Code \|\\n\| `\@create-review-issues` \| Create issues from review \(PR only\) \|\\n\| `\@gemini-help` \| Show this help message \|\\n(\| `\@pr-squash` \| Squash PR commits \(PR only\) \|\\n\| `\@conflict-resolve` \| Resolve merge conflicts \(PR only\) \|\\n)?\\n\[Manual Trigger Guide\]\(\$\{\{ github.server_url \}\}\/\$\{\{ github.repository \}\}\/blob\/leader\/docs\/workflows\/MANUAL_TRIGGERS.md\)//g' "$file"

    perl -0777 -pi -e 's/(\\n\\n)?---.*?#### 🤖 Gemini Manual Trigger Quick Reference.*?MANUAL_TRIGGERS\.md.*?//gs' "$file"
done
