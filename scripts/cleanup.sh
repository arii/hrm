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

# --- Argument Parsing ---
CLEAN_PNPM_CACHE=false
CLEAN_GLOBAL_CACHES=false
if [[ " $@ " =~ " --pnpm-cache " ]]; then
  CLEAN_PNPM_CACHE=true
fi
if [[ " $@ " =~ " --global " ]]; then
  CLEAN_GLOBAL_CACHES=true
fi

if [ "$SKIP_CLEAN" = "true" ]; then
  echo "⏩ SKIP_CLEAN is set, skipping infrastructure purge."
  exit 0
fi

echo "--- 🚀 INITIATING HRM INFRASTRUCTURE PURGE ---"
echo "--- 📍 SCOPE: $APP_DIR"

echo ""
echo "--- 📊 DISK USAGE (BEFORE) ---"
echo "--- Filesystem Usage ---"
df -h "$APP_DIR"
echo ""
echo "--- Directory Usage ---"
du -sh "$APP_DIR/.next" 2>/dev/null || echo "  - .next: Not found"
du -sh "$APP_DIR/node_modules" 2>/dev/null || echo "  - node_modules: Not found"
if [ -d "$WORKSPACE_DIR/actions-runner" ]; then
    du -sh "$WORKSPACE_DIR/actions-runner" 2>/dev/null || echo "  - actions-runner: Not found"
fi
echo "---------------------------------"
echo ""

# 1. Project-specific Build Artifacts and Logs
echo "🧹 Purging project-specific build artifacts and logs..."
rm -rf "$APP_DIR/dist"
rm -rf "$APP_DIR/coverage"
rm -rf "$APP_DIR/test-results"
rm -rf "$APP_DIR/playwright-report"
find "$APP_DIR" -type f -name "*.log" -not -path "*/logs/*" -delete
find "$APP_DIR" -name "*.backup" -type f -delete
rm -f "$APP_DIR/nohup.out"
rm -f "$APP_DIR/diff.txt"

# 2. Next.js & TypeScript Build Artifacts
# Purges the .next build folder and TS build info files
if [ -d "$APP_DIR/.next" ]; then
    echo "🧹 Purging Next.js build cache..."
    rm -rf "$APP_DIR/.next"
fi

find "$APP_DIR" -name "*.tsbuildinfo" -type f -delete

# 3. Node.js & Package Manager Caches
if [ "$CLEAN_GLOBAL_CACHES" = true ]; then
  # Deep clean of npm and optional package managers
  echo "🧹 Purging Node.js package caches..."
  npm cache clean --force
  if command -v yarn &> /dev/null; then
      echo "Attempting to clean yarn cache..."
      yarn cache clean || echo "Yarn cache clean failed or not applicable, continuing..."
  fi
  if command -v bun &> /dev/null; then
      echo "Attempting to clean bun cache..."
      bun pm cache rm || echo "Bun cache clean failed or not applicable, continuing..."
  fi
  if command -v pnpm &> /dev/null; then
    if [ "$CLEAN_PNPM_CACHE" = true ]; then
      echo "🧹 Purging pnpm cache..."
      pnpm store prune
    else
      echo "ℹ️ Skipping pnpm cache purge. To clean, re-run with '--pnpm-cache'."
    fi
  fi
else
  echo "ℹ️ Skipping global cache purge. To clean, re-run with '--global'."
fi

# 4. Process Management (PM2)
if [ "$CLEAN_GLOBAL_CACHES" = true ]; then
  # Flushes all logs and truncates current log files to 0 bytes
  if command -v pm2 &> /dev/null; then
      echo "🧹 Rotating and flushing PM2 process logs..."
      pm2 flush
      pm2 cleardump
  fi
fi

# 5. Conda & Python Environment Clean (The 9.3GB Culprit)
if [ "$CLEAN_GLOBAL_CACHES" = true ]; then
  # Forces removal of unused packages and tarballs
  if command -v conda &> /dev/null; then
      echo "🧹 Pruning Conda package index and cache..."
      conda clean --all -y
  fi
  if command -v pip &> /dev/null; then
      echo "🧹 Clearing Pip cache..."
      pip cache purge
  fi
fi

# 6. GitHub Actions Runner Artifacts
if [ "$CLEAN_GLOBAL_CACHES" = true ]; then
  # Targets the _diag and _work directories in the workspace
  if [ -d "$WORKSPACE_DIR/actions-runner" ]; then
      echo "🧹 Cleaning CI/CD Runner diagnostics and work volumes..."
      rm -rf "$WORKSPACE_DIR/actions-runner/_diag/"*
      rm -rf "$WORKSPACE_DIR/actions-runner/_work/"*
  fi
fi


echo "--- ✨ CLEANUP COMPLETE ---"
echo ""
echo "--- 📊 DISK USAGE (AFTER) ---"
echo "--- Filesystem Usage ---"
df -h "$APP_DIR"
echo ""
echo "--- Directory Usage ---"
du -sh "$APP_DIR/.next" 2>/dev/null || echo "  - .next: Not found"
du -sh "$APP_DIR/node_modules" 2>/dev/null || echo "  - node_modules: Not found"
if [ -d "$WORKSPACE_DIR/actions-runner" ]; then
    du -sh "$WORKSPACE_DIR/actions-runner" 2>/dev/null || echo "  - actions-runner: Not found"
fi
echo "--------------------------------"
