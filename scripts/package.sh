#!/bin/bash
set -e

echo "📦 Packaging HRM (Production Deployment)..."

# 1. Clean previous artifacts
rm -rf release_build
mkdir -p release_build

# 2. Copy the Next.js build output
# Production build uses .next_prod as distDir
echo "📋 Copying Next.js build (.next_prod)..."
cp -r .next_prod release_build/

# 3. Restore Client-Side Static Assets
# We need public assets for the server to serve
echo "📋 Restoring static assets..."
mkdir -p release_build/public
cp -r public/* release_build/public/

# 4. Copy Custom Server Artifacts
echo "📋 Adding custom server..."
cp -r dist release_build/

# 5. Copy Production Configuration & Scripts
echo "📋 Adding production config and runtime scripts..."
cp deploy/next.config.js release_build/
cp deploy/ecosystem.config.cjs release_build/
cp deploy/start-production.sh release_build/
mkdir -p release_build/scripts
# Only copy runtime scripts, exclude dev/test scripts if desired
cp scripts/deploy-artifact.sh release_build/scripts/
cp scripts/verify-deployment.sh release_build/scripts/

# 6. Critical: Dependency Manifests
# Include package.json and lock file for reference and optional install on server
cp package.json release_build/
cp pnpm-lock.yaml release_build/

# 7. Create the Tarball
echo "🗜️ Compressing release..."
cd release_build
tar -czf ../release.tar.gz .
cd ..
rm -rf release_build

echo "✅ Production Artifact 'release.tar.gz' ready."
