#!/bin/bash
# We don't set -e here because we want to run the second pass even if the first one fails
# set -eo pipefail

echo "🔍 Running linter..."
mkdir -p logs

# First pass: Generate JSON report for GitHub annotations
# This uses the command defined in package.json
pnpm run lint
LINT_EXIT_CODE=$?

# Second pass: Generate human-readable output for CI logs
# We override the format to 'stylish' and output to stdout (tee'd to log)
echo "📋 Generating human-readable lint report..."
pnpm exec eslint app/ components/ constants/ context/ hooks/ lib/ services/ tests/ types/ utils/ server.ts middleware.ts --cache --format stylish 2>&1 | tee logs/lint-output.log

# Exit with the exit code from the first pass (or second, they should be the same)
exit $LINT_EXIT_CODE
