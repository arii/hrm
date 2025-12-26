#!/bin/bash
# deploy.sh - Production deployment for HRM (Leader Branch)

set -e # Exit immediately on error

# Configuration
BRANCH="leader"
PM2_APP_NAME="hrm-server"

echo "🚀 Starting HRM production deployment..."

# 1. Environment & Prerequisites Check
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpm not found. Installing global pnpm..."
    npm install -g pnpm
fi

if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    exit 1
fi

# 2. Git Sync (Leader Branch)
echo "🔄 Syncing with origin/$BRANCH..."
git fetch origin
git reset --hard origin/$BRANCH

# 3. Install Dependencies & Build
echo "📦 Installing dependencies and building application..."
# We need to temporarily install dev deps to build (TS, Next CLI),
# OR ensure your build machine has them.
# STRATEGY: It is often safer to install ALL deps, build, then prune.
pnpm install --frozen-lockfile # Install all for build tools
pnpm run build
pnpm prune --prod # Remove dev deps to keep runtime light

# 4. Nginx Validation
if command -v nginx &> /dev/null; then
    echo "🔍 nginx found, testing config..."
    if sudo -n true 2>/dev/null; then
        sudo nginx -t
    fi
fi

# 6. PM2 Process Management
echo "🔄 Reloading application..."
# Check if app is running
if pm2 list | grep -q "$PM2_APP_NAME"; then
    # Reload allows for zero-downtime if architecture permits, otherwise use restart
    pm2 reload ecosystem.config.cjs --env production --update-env
    echo "✅ Application reloaded."
else
    # First time start
    pm2 start ecosystem.config.cjs --env production
    echo "✅ Application started."
fi

pm2 save
echo "🎉 Deployment to '$BRANCH' complete!"
