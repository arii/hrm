#!/bin/bash
set -eo pipefail

echo "🧪 Running visual tests..."
mkdir -p logs test-results
pnpm run test:visual 2>&1 | tee logs/visual-output.log
