#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "Running setup script..."

# Copy .env.example to .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
else
  echo ".env.local already exists, skipping creation."
fi

# Verify package-lock.json integrity and install dependencies
echo "Installing dependencies with npm ci..."
npm ci

echo "Setup complete."
