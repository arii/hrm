#!/bin/bash
set -e

echo "📦 Packaging HRM (Hybrid Standalone + Custom Server)..."

# 1. Clean previous artifacts
rm -rf release_build
mkdir -p release_build

# 2. Copy the Next.js Standalone build as the base
# This gives us a minimal .next folder and a partial node_modules
echo "📋 Copying Standalone base..."
cp -r .next/standalone/node_modules release_build/
cp -r .next/standalone/.next release_build/

# 3. Restore Client-Side Static Assets
# Standalone excludes 'public' and '.next/static' by default; we need them.
echo "📋 Restoring static assets..."
mkdir -p release_build/public
cp -r public/* release_build/public/
mkdir -p release_build/.next/static
cp -r .next/static/* release_build/.next/static/

# 4. Copy Custom Server Artifacts
# Your 'server.mjs' expects to find '.next' in the same directory.
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

echo "✅ Hybrid Artifact 'release.tar.gz' ready."
