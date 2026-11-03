#!/bin/bash
set -eo pipefail

echo "🧪 Running visual tests..."
mkdir -p logs test-results
# The quality job downloads the build-check artifacts (dist/ + .next_prod/)
# before this script runs, so reuse them instead of a second ~3min build.
SKIP_BUILD=true pnpm run test:visual 2>&1 | tee logs/visual-output.log
