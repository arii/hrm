#!/bin/bash
set -e

# Install npm dependencies
npm install

# Install Playwright browsers and dependencies
npx playwright install --with-deps

echo "Dev container setup complete."
