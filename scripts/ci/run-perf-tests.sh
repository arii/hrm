#!/bin/bash
set -eo pipefail

echo "🧪 Running performance tests..."
mkdir -p logs test-results

PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/perf-results.xml pnpm run test:perf --reporter=junit 2>&1 | tee logs/perf-output.log
