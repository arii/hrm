#!/bin/bash
set -eo pipefail

echo "🏗️ Building project..."
mkdir -p logs
# Ensure NEXT_PUBLIC_TESTING and NEXT_PUBLIC_USE_NATIVE_TABLE are set so all features
# and test controls (window.TEST_CONTROLS) are available in the build.
NEXT_PUBLIC_TESTING=true NEXT_PUBLIC_USE_NATIVE_TABLE=true pnpm run build 2>&1 | tee logs/build-output.log
