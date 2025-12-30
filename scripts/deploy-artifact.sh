#!/bin/bash
set -e

# Define Deployment Root
DEPLOY_DIR="$HOME/hrm"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR" || { echo "❌ Directory $DEPLOY_DIR not found"; exit 1; }

# Initialize NVM if it exists (for systems where Node is managed by NVM)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

echo "🚀 Starting Deployment..."

# ==============================================================================
# 1. PRE-FLIGHT CHECK: PNPM AVAILABILITY
# ==============================================================================
echo "🔧 Verifying environment tools..."

# Check if pnpm is in the PATH
if ! command -v pnpm &> /dev/null; then
    echo "⚠️ 'pnpm' not found. Attempting global install..."

    # Try installing globally using npm
    if npm install -g pnpm; then
        echo "✅ pnpm installed successfully."
    else
        echo "❌ Global install failed (likely permission denied)."
        echo "⚠️ Falling back to 'npx pnpm'..."
        # Set a variable to use npx prefix for subsequent commands
        PNPM_CMD="npx pnpm"
    fi
else
    echo "✅ pnpm is available: $(pnpm --version)"
    PNPM_CMD="pnpm"
fi

# Ensure PNPM_CMD is set if it wasn't set in the 'else' block above
PNPM_CMD="${PNPM_CMD:-pnpm}"

# ==============================================================================
# 2. DEPLOYMENT LOGIC
# ==============================================================================

# Safety Check
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production is missing! Deployment aborted."
    exit 1
fi

echo "📂 Extracting artifact..."
# Use --overwrite to ensure clean state
tar -xzf release.tar.gz --overwrite

echo "🔐 Setting script permissions..."
chmod +x ./start-production.sh
chmod +x ./scripts/deploy-artifact.sh
chmod +x ./scripts/verify-deployment.sh

echo "📦 Hydrating production dependencies..."
# Use the dynamic command (pnpm or npx pnpm)
# Suppress WARN messages about missing bin symlinks (non-fatal in production)
$PNPM_CMD install --prod --ignore-scripts 2>&1 | grep -v "WARN.*Failed to create bin" || true

echo "🔄 Reloading PM2..."
# Use pnpm exec to ensure the project's local pm2 is used
$PNPM_CMD exec pm2 startOrReload ecosystem.config.cjs --env production --update-env

echo "🕵️ Running Verification..."
./scripts/verify-deployment.sh

echo "✅ Deployment Complete."
