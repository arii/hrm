#!/bin/bash
# Optimized CI Linter script to avoid double-runs and provide inline annotations
set -o pipefail

mkdir -p logs

echo "🔍 Running ESLint..."
# Run ESLint once and generate a JSON report.
# We capture the output in a file and also silence it from stdout during the run.
pnpm run lint --format json -o logs/eslint-report.json > /dev/null 2>&1
LINT_EXIT_CODE=$?

if [ ! -f logs/eslint-report.json ]; then
  echo "❌ ESLint failed to generate a report."
  exit 1
fi

# 1. Emit GitHub Actions annotations and also print to console for log visibility
# We use jq to transform the JSON report into ::error and ::warning commands
# and also a readable console format.
jq -r '.[] | .filePath as $file | .messages[] |
  "::\(if .severity == 2 then "error" else "warning" end) file=\($file),line=\(.line),col=\(.column),title=\(.ruleId)::\(.message)",
  "[\(if .severity == 2 then "ERROR" else "WARN" end)] \($file):\(.line):\(.column) - \(.message) (\(.ruleId))"' logs/eslint-report.json

# 2. Print a human-readable summary to the console
ERROR_COUNT=$(jq '[.[] | .messages[] | select(.severity == 2)] | length' logs/eslint-report.json)
WARNING_COUNT=$(jq '[.[] | .messages[] | select(.severity == 1)] | length' logs/eslint-report.json)

echo ""
echo "----------------------------------------"
if [ "$LINT_EXIT_CODE" -eq 0 ]; then
  echo "✅ ESLint passed! ($WARNING_COUNT warnings)"
else
  echo "❌ ESLint failed with $ERROR_COUNT errors and $WARNING_COUNT warnings."
fi
echo "----------------------------------------"

# 3. Generate summary table for GITHUB_STEP_SUMMARY
if [ "$LINT_EXIT_CODE" -ne 0 ] || [ "$WARNING_COUNT" -gt 0 ]; then
  echo "### 🔍 Lint Report Summary" >> $GITHUB_STEP_SUMMARY
  echo "| Severity | File | Line | Message | Rule |" >> $GITHUB_STEP_SUMMARY
  echo "| :--- | :--- | :--- | :--- | :--- |" >> $GITHUB_STEP_SUMMARY

  # Limit to 50 issues in the summary to avoid overwhelming the PR page
  jq -r '.[] | .filePath as $file | .messages[] | "| \(if .severity == 2 then "❌ Error" else "⚠️ Warning" end) | \($file | split("/") | last) | \(.line) | \(.message) | \(.ruleId) |"' logs/eslint-report.json | head -n 50 >> $GITHUB_STEP_SUMMARY

  TOTAL_ISSUES=$((ERROR_COUNT + WARNING_COUNT))
  if [ "$TOTAL_ISSUES" -gt 50 ]; then
    echo "... and $((TOTAL_ISSUES - 50)) more issues. See job logs or the 'Files Changed' tab for details." >> $GITHUB_STEP_SUMMARY
  fi
fi

exit $LINT_EXIT_CODE
