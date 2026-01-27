#!/bin/bash
set -eo pipefail

echo "🧪 Running unit tests..."
mkdir -p logs test-results

# Run tests and save the exit code, tee output to log file
pnpm run test:unit 2>&1 | tee logs/unit-output.log
exit_code=${PIPESTATUS[0]}

# Exit with the captured exit code
exit $exit_code
