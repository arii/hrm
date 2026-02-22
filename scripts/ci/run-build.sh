#!/bin/bash
set -eo pipefail

echo "🏗️ Building project..."
mkdir -p logs
# Ensure NEXT_PUBLIC_TESTING is set so test controls (window.__TEST_CONTROLS__) are available
NEXT_PUBLIC_TESTING=true pnpm run build 2>&1 | tee logs/build-output.log
