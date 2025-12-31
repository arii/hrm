#!/bin/bash
set -eo pipefail

echo "🏗️ Building project..."
mkdir -p logs
pnpm run build 2>&1 | tee logs/build-output.log
