#!/bin/bash
# ==============================================================================
# HRM Project - Infrastructure Cleanup Script
# Path-agnostic utility to purge build artifacts and global cache bloat.
# Target: ~50GB+ of identified environment storage overhead.
# ==============================================================================

set -e

# Get the absolute path of the 'hrm' directory and its workspace parent
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(dirname "$APP_DIR")"

echo "--- 🚀 INITIATING HRM INFRASTRUCTURE PURGE ---"
echo "--- 📍 SCOPE: $APP_DIR"

# 1. Next.js & TypeScript Build Artifacts
# Purges the .next build folder and TS build info files
if [ -d "$APP_DIR/.next" ]; then
    echo "🧹 Purging Next.js build cache..."
    rm -rf "$APP_DIR/.next"
fi

find "$APP_DIR" -name "*.tsbuildinfo" -type f -delete

# 2. Node.js & Package Manager Caches
# Deep clean of npm and optional package managers
echo "🧹 Purging Node.js package caches..."
npm cache clean --force
if command -v yarn &> /dev/null; then yarn cache clean; fi
if command -v bun &> /dev/null; then bun pm cache rm; fi

# 3. Process Management (PM2)
# Flushes all logs and truncates current log files to 0 bytes
if command -v pm2 &> /dev/null; then
    echo "🧹 Rotating and flushing PM2 process logs..."
    pm2 flush
    pm2 cleardump
fi

# 4. Conda & Python Environment Clean (The 9.3GB Culprit)
# Forces removal of unused packages and tarballs
if command -v conda &> /dev/null; then
    echo "🧹 Pruning Conda package index and cache..."
    conda clean --all -y
fi
if command -v pip &> /dev/null; then
    echo "🧹 Clearing Pip cache..."
    pip cache purge
fi


# 5. Global User Cache (~11GB) - CI ONLY
# This is a dangerous operation, so it is restricted to CI environments.
if [ -n "$CI" ]; then
    echo "🧹 Emptying ~/.cache directory..."
    rm -rf ~/.cache/*
fi

# 6. GitHub Actions Runner Artifacts
# Targets the _diag and _work directories in the workspace
if [ -d "$WORKSPACE_DIR/actions-runner" ]; then
    echo "🧹 Cleaning CI/CD Runner diagnostics and work volumes..."
    rm -rf "$WORKSPACE_DIR/actions-runner/_diag/"*
    rm -rf "$WORKSPACE_DIR/actions-runner/_work/"*
fi

# 7. Real-time Log Vacuuming
# Requires sudo for journalctl; fails gracefully if permissions are absent
echo "🧹 Vacuuming system journals (>24h)..."
sudo journalctl --vacuum-time=1d 2>/dev/null || echo "⚠️  Sudo unavailable: Skipping journal vacuuming."

echo "--- ✨ CLEANUP COMPLETE ---"
df -h "$APP_DIR" | awk 'NR==2 {print "📊 Available Storage: " $4}'
