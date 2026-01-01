#!/bin/bash
# Used by PM2 to start the application.
# Assumes the script is run from the project root.
set -euo pipefail

export NODE_ENV=production

# Load secrets if the .env.production file exists
if [ -f .env.production ]; then
  echo "Loading production environment variables..."
  set -a
  source .env.production
  set +a
fi

echo "Starting HRM server application..."
# This is the final command that starts our server.
# `exec` replaces the shell process with the Node.js process.
exec node dist/server.js
