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

# 2. Git Repository Check
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ Error: This is not a Git repository. Deployment aborted."
    exit 1
fi

# 3. Git Sync (Leader Branch)
echo "🔄 Syncing with origin/$BRANCH..."
git fetch origin
git reset --hard origin/$BRANCH

# 4. Install Dependencies & Build
echo "📦 Installing dependencies and building application..."
# STRATEGY: Install all dependencies (including dev) to ensure build tools are available.
# After a successful build, prune dev dependencies to keep the runtime environment light.
pnpm install --frozen-lockfile # Install all for build tools
pnpm run build
pnpm prune --prod # Remove dev deps to keep runtime light

# 5. Nginx Validation
if command -v nginx &> /dev/null; then
    echo "🔍 nginx found, testing config..."
    if sudo -n true 2>/dev/null; then
        # Capture output and check exit code
        if ! NGINX_OUTPUT=$(sudo nginx -t 2>&1); then
            echo "❌ Error: nginx configuration test failed!"
            echo "$NGINX_OUTPUT"
            exit 1
        fi
        echo "✅ Nginx configuration is valid."
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
