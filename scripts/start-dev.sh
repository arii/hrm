#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Change to the script's directory, then to the repo root
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")"/..)"

# Source environment variables
if [ -f .env.local ]; then
  echo "Loading development environment variables from .env.local..."
  set -o allexport
  source .env.local
  set +o allexport
else
  echo "ERROR: .env.local file not found. Please create one from .env.example."
  exit 1
fi

# Run the server with ts-node and pipe to pino-pretty
echo "Starting development server..."
pnpm exec ts-node --esm --transpile-only --project tsconfig.json server.ts | pnpm exec pino-pretty
