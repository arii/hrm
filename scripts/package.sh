#!/bin/bash
set -e

echo "📦 Packaging HRM (Standalone)..."

# 1. Clean previous artifacts
rm -rf release_build
mkdir -p release_build

# 2. Copy the Next.js Standalone build
echo "📋 Copying Standalone build..."
cp -r .next/standalone/. release_build/

# 3. Restore Client-Side Static Assets
echo "📋 Restoring static assets..."
mkdir -p release_build/public
cp -r public/* release_build/public/
mkdir -p release_build/.next/static
cp -r .next/static/* release_build/.next/static/

# 4. Copy Production Configuration & Scripts
echo "📋 Adding production config and runtime scripts..."
cp server.js release_build/
cp ecosystem.config.cjs release_build/
cp scripts/start-production.sh release_build/
mkdir -p release_build/scripts
cp scripts/deploy-artifact.sh release_build/scripts/
cp scripts/verify-deployment.sh release_build/scripts/


# 5. Critical: Dependency Manifests
cp package.json release_build/
cp pnpm-lock.yaml release_build/

# 6. Create the Tarball
echo "🗜️ Compressing release..."
cd release_build
tar -czf ../release.tar.gz .
cd ..
rm -rf release_build

echo "✅ Standalone Artifact 'release.tar.gz' ready."
