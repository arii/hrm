#!/bin/bash
# scripts/deploy-artifact.sh
set -e

DEPLOY_DIR="$HOME/hrm"
cd "$DEPLOY_DIR" || { echo "❌ Directory $DEPLOY_DIR not found"; exit 1; }

echo "🚀 Starting Strict Artifact Deployment..."

# 1. Safety Check: Secrets
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production is missing! Deployment aborted."
    exit 1
fi

# 2. Extract Artifact
echo "📂 Extracting release..."
tar -xzf release.tar.gz

# 3. Install Dependencies
echo "📦 Syncing production dependencies..."
npm ci --omit=dev

# 4. Strict Reload
echo "🔄 Enforcing Production Reload..."
npx pm2 startOrReload ecosystem.config.cjs --env production --update-env

# 5. VERIFICATION STEP
echo "🕵️ Running post-deployment verification..."
./scripts/verify-deployment.sh

echo "✅ Deployment & Verification Complete (Strict Production Mode)"
