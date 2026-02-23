#!/bin/bash
set -eo pipefail

echo "🔍 Running linter..."
mkdir -p logs

# Run with JSON output for GitHub Actions annotations
pnpm run lint --format json -o logs/eslint-report.json
