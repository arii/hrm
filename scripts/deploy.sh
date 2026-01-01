#!/bin/bash
# Safer deployment script with rollback for an in-place deployment strategy.
set -euo pipefail

# --- Configuration ---
APP_NAME="hrm-server"
# Use PORT from environment, fallback to 3000
PORT="${PORT:-3000}"
HEALTH_CHECK_URL="http://127.0.0.1:${PORT}/health/ready"
STARTUP_TIMEOUT=60 # seconds
LOG_FILE="/tmp/${APP_NAME}-deployment.log"
# Use PM2's default dump file path for robustness.
PM2_DUMP_FILE="$HOME/.pm2/dump.pm2"
MAIN_BRANCH="leader" # Or your main deployment branch

# --- Logging ---
# Redirect stdout and stderr to a log file and the console.
exec > >(tee -a "${LOG_FILE}") 2>&1

# --- Helper Functions ---
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] - $1"
}

save_state() {
  log "💾 Saving current state for potential rollback..."
  # Save the current commit hash
  git rev-parse HEAD > last_known_good_commit.txt
  # Save the current PM2 process list
  if pnpm exec pm2 id "$APP_NAME" >/dev/null 2>&1; then
    pnpm exec pm2 save --force
    log "PM2 state saved to $PM2_DUMP_FILE"
  else
    log "No existing PM2 process found for $APP_NAME. Skipping PM2 save."
  fi
}

update_and_build() {
  log "🚚 Fetching latest code from origin..."
  git fetch
  git reset --hard "origin/${MAIN_BRANCH}"

  log "📦 Installing dependencies..."
  pnpm install --frozen-lockfile

  log "🗑️ Pruning development dependencies..."
  pnpm prune --prod

  log "🛠️ Building the application..."
  pnpm run build
}

validate_nginx() {
  log "🔍 Validating Nginx configuration..."
  if sudo nginx -t; then
    log "Nginx configuration is valid."
  else
    log "❌ Nginx configuration validation failed. Aborting deployment."
    exit 1
  fi
}

start_new_version() {
  # This script uses 'reload' to attempt a zero-downtime deployment.
  # If the app doesn't exist, it falls back to a regular 'start'.
  # The trade-off for zero-downtime is that rollback is more complex.
  # A full stop/start (delete/start) provides a cleaner state for verification
  # at the cost of brief downtime. This script prioritizes minimal downtime.
  log "🔄 Reloading application for zero-downtime update..."
  pnpm exec pm2 reload "$APP_NAME" --update-env || {
    log "Reload failed or app not running. Attempting to start..."
    pnpm exec pm2 start ecosystem.config.cjs
  }
}

verify_startup() {
  log "⌛ Waiting for application to be healthy at $HEALTH_CHECK_URL..."
  local start_time=$(date +%s)

  while true; do
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))

    if [ $elapsed -ge $STARTUP_TIMEOUT ]; then
      log "⏱️ Timeout reached. Application did not start in time."
      return 1
    fi

    if curl -s --fail $HEALTH_CHECK_URL > /dev/null; then
      log "💚 Application is healthy!"
      return 0
    fi

    sleep 5
  done
}

rollback() {
  log "⏪ Rolling back to the previous version..."

  # Stop the failing new version
  pnpm exec pm2 delete "$APP_NAME" >/dev/null 2>&1 || true

  # Revert the code
  local last_commit=$(cat last_known_good_commit.txt)
  log "Reverting code to commit $last_commit"
  git reset --hard "$last_commit"

  log "📦 Reinstalling dependencies for previous version..."
  pnpm install --frozen-lockfile

  log "🗑️ Pruning development dependencies for previous version..."
  pnpm prune --prod

  log "🛠️ Rebuilding previous version..."
  pnpm run build

  # Resurrect the last known good PM2 state
  log "Restoring previous PM2 process..."
   if [ -f "$PM2_DUMP_FILE" ]; then
    pnpm exec pm2 resurrect
    log "↩️ Rollback complete. Previous version restored."
  else
    log "⚠️ No PM2 dump file found. Attempting to start the old version manually..."
    pnpm exec pm2 start ecosystem.config.cjs
  fi
}

# --- Main Deployment Logic ---
main() {
  log "🚀 Starting deployment of $APP_NAME..."

  # 1. Save current state
  save_state

  # 2. Update code and build
  update_and_build

  # 3. Validate Nginx configuration
  validate_nginx

  # 4. Start the new version
  start_new_version

  # 5. Verify the new version
  if ! verify_startup; then
    log "❌ Deployment failed. Initiating rollback..."
    rollback
    exit 1
  fi

  log "✅ Deployment successful!"
}

# --- Script Entrypoint ---
main
