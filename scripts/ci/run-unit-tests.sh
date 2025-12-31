#!/bin/bash
set -eo pipefail

echo "🧪 Running unit tests..."
mkdir -p logs test-results
pnpm run test:unit 2>&1 | tee logs/unit-output.log
