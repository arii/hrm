#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Set the working directory to the root of the project
cd "$(dirname "$0")/../.."

# Create a directory for logs if it doesn't exist
mkdir -p logs

# Run component tests and log the output
echo "🧪 Running component tests..."
pnpm run test:components 2>&1 | tee logs/component-output.log
