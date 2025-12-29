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

# For Next.js standalone output, the entry point is now our custom server.
exec node .next/standalone/dist/standalone-server.js
