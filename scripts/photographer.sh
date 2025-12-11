#!/bin/bash
set -e

# Function to ensure the Storybook process is terminated
cleanup() {
    echo "🧹 Cleaning up Storybook process..."
    if [ -f /tmp/storybook.pid ]; then
        kill $(cat /tmp/storybook.pid) 2>/dev/null || true
        rm /tmp/storybook.pid
    fi
}

# Trap exit signals to ensure cleanup is always called
trap cleanup EXIT

# Navigate to the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Start Storybook in the background
echo "🚀 Launching Storybook on port 6006..."
pnpm run storybook > /tmp/storybook.log 2>&1 &
echo $! > /tmp/storybook.pid

# Wait for Storybook to be ready
echo "⏳ Waiting for Storybook to become available..."
npx wait-on http://127.0.0.1:6006 --timeout 60000

echo "✅ Storybook is ready."

# Run Playwright tests against Storybook
echo "📸 Capturing visual snapshots of all stories..."
pnpm exec playwright test --config=tests/playwright/storybook.config.ts "$@"

echo "🎉 Visual snapshot process complete."
