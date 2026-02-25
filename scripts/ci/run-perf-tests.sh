#!/bin/bash
set -eo pipefail

echo "🧪 Running performance tests..."
mkdir -p logs test-results

# Run performance tests sequentially to ensure metric reliability (avoid "noisy neighbor" effects)
PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/perf-results.xml pnpm run test:perf 2>&1 | tee logs/perf-output.log
