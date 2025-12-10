#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/hrm"
BRANCH="main"

echo "🚀 Starting Deployment..."

# Change to the application directory
cd $APP_DIR

# 1. Pre-flight Safety Checks
echo "🔎 Performing pre-flight safety checks..."

# Check for .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Deployment aborted. Please ensure the production environment file exists."
    exit 1
fi

# Check Nginx configuration if possible
if command -v nginx &> /dev/null && command -v sudo &> /dev/null; then
    if sudo -n true 2>/dev/null; then
        if ! sudo nginx -t &> /dev/null; then
            echo "❌ Error: nginx configuration test failed!"
            echo "Deployment aborted. Please fix your nginx configuration before deploying."
            exit 1
        fi
        echo "✅ Nginx configuration test passed."
    else
        echo "⚠️  Warning: Cannot test nginx configuration without sudo access. Proceeding with caution..."
    fi
else
    echo "⚠️  Warning: nginx or sudo not found. Skipping nginx configuration check."
fi

# 2. Update Codebase
echo "📥 Pulling latest changes..."
git fetch origin
git reset --hard origin/$BRANCH

# 3. Dependency Management (Clean Install)
echo "📦 Installing dependencies..."
pnpm ci --only=production

# 4. Build Application
echo "🔨 Building Next.js application..."
pnpm run build

# 5. Process Management (PM2 Zero-Downtime Reload)
echo "🔄 Reloading PM2 application..."
pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

# 6. Save PM2 Process List
echo "💾 Saving PM2 process list for reboot..."
pm2 save

echo "✅ Deployment Successful!"
