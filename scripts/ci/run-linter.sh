#!/bin/bash
set -o pipefail

echo "🔍 Running linter..."
mkdir -p logs

# Register Problem Matcher for custom ESLint output
echo "::add-matcher::.github/eslint-matcher.json"

# Run ESLint with JSON output
pnpm run lint --format json -o logs/eslint-report.json
LINT_EXIT_CODE=$?

# Generate compact output for Problem Matcher and Logs
if [ -f logs/eslint-report.json ]; then
  # Capture output for Problem Matcher and artifact upload
  jq -r '.[] | .filePath as $file | .messages[] | "\($file):\(.line):\(.column):\(if .severity == 2 then "error" else "warning" end):\(.message):\(.ruleId)"' logs/eslint-report.json | tee logs/lint-output.log

  # Generate Job Summary table for the first 20 errors
  echo "### 🔍 Lint Report Summary" >> $GITHUB_STEP_SUMMARY
  echo "| File | Line | Message | Rule |" >> $GITHUB_STEP_SUMMARY
  echo "| :--- | :--- | :--- | :--- |" >> $GITHUB_STEP_SUMMARY
  # Truncate path for readability in summary
  jq -r '.[] | .filePath as $file | .messages[] | "| \($file | split("/") | last) | \(.line) | \(.message) | \(.ruleId) |"' logs/eslint-report.json | head -n 20 >> $GITHUB_STEP_SUMMARY

  if [ $(jq '[.[] | .messages[]] | length' logs/eslint-report.json) -gt 20 ]; then
    echo "... and more. See full logs for details." >> $GITHUB_STEP_SUMMARY
  fi
fi

exit $LINT_EXIT_CODE
