#!/bin/bash
set -e

# Source environment variables
if [ -f .env.production ]; then
  echo "Loading environment variables from .env.production"
  export $(cat .env.production | sed 's/#.*//g' | xargs)
fi

# Start the server using the compiled entry point
echo "Starting server..."
exec node dist/server.mjs