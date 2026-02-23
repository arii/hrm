#!/bin/bash
set -o pipefail

echo "🔍 Running linter..."
mkdir -p logs

# First pass: Run ESLint with stylish output for human-readable logs and summary
pnpm run lint --format stylish 2>&1 | tee logs/lint-output.log
LINT_EXIT_CODE=${PIPESTATUS[0]}

# Second pass: Generate JSON report for GitHub annotations
# We use --cache to make this run very fast
pnpm run lint --format json -o logs/eslint-report.json || true

exit $LINT_EXIT_CODE
