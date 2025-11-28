#!/bin/bash
# start-production.sh - HRM Production Start Script
# This script is the single entry point for running the application in a production environment.
# It handles environment variable loading and starts the server with PM2.

# Set the working directory to the project root
cd "$(dirname "$0")"

# Load production environment variables if the file exists
if [ -f ".env.production" ]; then
  echo "[start-production] Loading environment variables from .env.production"
  # Use 'export' and 'source' to ensure variables are available to the PM2 process
  export $(grep -v '^#' .env.production | xargs)
else
  echo "[start-production] Warning: .env.production not found. Running without secrets (Spotify features disabled)."
fi

# Use the PORT environment variable if it's set, otherwise default to 3000
# This allows the test environment to override the port
# The ':-' syntax provides a default value if the variable is unset or null
APP_PORT=${PORT:-3000}

echo "[start-production] Starting server on port $APP_PORT..."

# Start the application using PM2 and the ecosystem config file
# --update-env ensures that any changes to the environment file are loaded on restart
pm2 start ecosystem.config.cjs --env production --update-env --name "hrm-server-$APP_PORT" -- --port $APP_PORT
