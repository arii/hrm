#!/bin/bash
# start-production.sh - HRM Production Start Script
# This script is the single entry point for running the application in a production environment.

# Set the working directory to the project root
cd "$(dirname "$0")"

# Load production environment variables if the file exists
if [ -f ".env.production" ]; then
  echo "[start-production] Loading environment variables from .env.production"
  export $(grep -v '^#' .env.production | xargs)
fi

# Use the PORT environment variable if it's set, otherwise default to 3000
APP_PORT=${PORT:-3000}

echo "[start-production] Starting server on port $APP_PORT..."

# Start the application directly with Node
node dist/server.mjs --port $APP_PORT
