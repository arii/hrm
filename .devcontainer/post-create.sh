#!/bin/bash
set -e

echo "Starting post-create setup..."

# Run the main setup script
bash scripts/setup.sh

# Install Playwright browsers and dependencies
echo "Installing Playwright browsers..."
npx playwright install --with-deps

echo "Dev container setup complete."
