#!/bin/bash
# Used by PM2 or Docker entrypoints
# Assumes the script is run from the project root.

export NODE_ENV=production

# Load secrets strictly for the process scope
if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
fi

# Explicitly run the compiled server entry point
# This expects a 'dist' directory with the compiled server.
exec node dist/server.js
