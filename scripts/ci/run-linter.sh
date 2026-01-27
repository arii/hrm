#!/bin/bash
set -eo pipefail

echo "🔍 Running linter..."
mkdir -p logs
pnpm run lint 2>&1 | tee logs/lint-output.log
