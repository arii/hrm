#!/bin/bash
# This wrapper script selects the appropriate .env file based on the environment
# and then executes the development server.

# Default to .env.local for standard development
ENV_FILE=".env.local"

# If in a test environment, use .env.test instead
if [ "$NODE_ENV" = "test" ] || [ "$TESTING" = "true" ]; then
  # Check if .env.test exists, otherwise fall back to .env.local
  if [ -f ".env.test" ]; then
    ENV_FILE=".env.test"
  fi
fi

echo "🚀 Starting server with environment file: $ENV_FILE"

# Execute the server with the selected environment file
exec cross-env NODE_ENV=development TS_NODE_TRANSPILE_ONLY=true node --env-file="$ENV_FILE" --loader ts-node/esm server.ts | pnpm exec pino-pretty
