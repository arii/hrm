#!/bin/bash
set -o pipefail

mkdir -p logs

echo "🔎 Running Slop Check..."

set +e
pnpm run lint:slop > logs/slop-output.log 2>&1
SLOP_EXIT_CODE=$?
set -e

if [ $SLOP_EXIT_CODE -eq 0 ]; then
  echo "✅ No AI slop detected."
  exit 0
else
  echo "::error::AI Slop detected (Exit Code: $SLOP_EXIT_CODE)"

  echo "generating diff..."
  BASE_REF="${BASE_REF:-leader}"

  echo "Fetching base branch: origin/$BASE_REF (depth=1)..."
  git fetch origin "$BASE_REF" --depth=1

  git diff FETCH_HEAD HEAD > logs/changes.diff

  echo "Preparing Gemini task..."

  TASK_FILE="gemini_slop_task.txt"
  OUTPUT_FILE="logs/gemini_slop_response.md"

  cat <<EOF > "$TASK_FILE"
Analysis Task: AI Slop Detection
Context: A CI check has detected "slop" words (low-value filler content) in the codebase.
Instructions:
1. Review the detected slop matches below.
2. Review the git diff to understand the context.
3. For each match, explain why it is problematic or if it is a false positive.
4. Suggest a higher-quality alternative.

--- Slop Matches ---
EOF
  sed 's/\x1b\[[0-9;]*m//g' logs/slop-output.log >> "$TASK_FILE"

  cat <<EOF >> "$TASK_FILE"

--- Git Diff (Truncated) ---
EOF
  # Truncate diff to avoid token limits
  head -n 1000 logs/changes.diff >> "$TASK_FILE"

  # Add marker if truncated
  if [ "$(wc -l < logs/changes.diff)" -gt 1000 ]; then
    echo "... (Diff truncated) ..." >> "$TASK_FILE"
  fi

  echo "🤖 Invoking Gemini AI..."

  npx tsx scripts/gemini-client.ts --task-file "$TASK_FILE" --output "$OUTPUT_FILE"

  if [ -n "$GITHUB_STEP_SUMMARY" ]; then
      echo "### 🧹 AI Slop Detection Report" >> "$GITHUB_STEP_SUMMARY"
      cat "$OUTPUT_FILE" >> "$GITHUB_STEP_SUMMARY"

      echo "" >> "$GITHUB_STEP_SUMMARY"
      echo "<details><summary>Raw Slop Report</summary>" >> "$GITHUB_STEP_SUMMARY"
      echo '```text' >> "$GITHUB_STEP_SUMMARY"
      cat logs/slop-output.log >> "$GITHUB_STEP_SUMMARY"
      echo '```' >> "$GITHUB_STEP_SUMMARY"
      echo "</details>" >> "$GITHUB_STEP_SUMMARY"
  fi

  exit 1
fi
