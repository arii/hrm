#!/bin/bash
# scripts/package.sh
set -e

echo "📦 Packaging HRM release artifact..."

# Ensure permissions
chmod +x start-production.sh
chmod +x ecosystem.config.cjs
chmod +x scripts/verify-deployment.sh # <--- NEW

# Bundle
tar -czf release.tar.gz \
    .next \
    dist \
    public \
    package.json \
    package-lock.json \
    next.config.js \
    ecosystem.config.cjs \
    start-production.sh \
    scripts/deploy-artifact.sh \
    scripts/verify-deployment.sh # <--- NEW

echo "✅ Artifact 'release.tar.gz' ready."
