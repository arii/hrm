#!/bin/bash
# Used by PM2 or Docker entrypoints
# Assumes the script is run from the project root.

if [ "$NODE_ENV" == "test" ]; then
  if [ -f .env.test ]; then
    set -a
    source .env.test
    set +a
  fi
else
  export NODE_ENV=production
  # Load secrets strictly for the process scope
  if [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
  fi
fi

# Explicitly run the compiled server entry point
# This expects a 'dist' directory with the compiled server.
exec node dist/server.js
