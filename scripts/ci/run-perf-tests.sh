#!/bin/bash
set -eo pipefail

echo "🧪 Running performance tests..."
mkdir -p logs test-results

# Run performance tests sequentially to ensure metric reliability (avoid "noisy neighbor" effects)
# The quality job downloads the build-check artifacts (dist/ + .next_prod/)
# before this script runs, so reuse them instead of a second ~3min build.
SKIP_BUILD=true PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/perf-results.xml pnpm run test:perf 2>&1 | tee logs/perf-output.log
