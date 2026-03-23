#!/bin/bash
set -e

echo "Starting post-create setup..."

echo "Installing jq..."
sudo apt-get update && sudo apt-get install -y jq

# Run the main setup script
bash scripts/setup.sh

# Install Playwright browsers and dependencies
echo "Installing Playwright browsers..."
npx playwright install --with-deps

echo "Dev container setup complete."