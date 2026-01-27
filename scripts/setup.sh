#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "Running setup script..."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
  else
    echo "No .env.example found. Creating an empty .env.local."
    touch .env.local
  fi
else
  echo ".env.local already exists, skipping creation."
fi

# Verify pnpm-lock.yaml integrity and install dependencies
echo "Installing dependencies with pnpm..."
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

# 5. Verify Git Hooks (Husky)
echo "🪝 Verifying git hooks..."

if grep -q '"husky"' package.json; then
    echo "🐶 Husky configuration detected."
    pnpm prepare
    echo "✅ Husky hooks installed."
else
    echo "⚠️ Husky not found in package.json."
fi

echo "Setup complete."
