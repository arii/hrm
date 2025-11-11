#!/bin/bash
# File: scripts/kill-all.sh
# Kill all HRM-related processes for clean test runs

echo "🛑 Stopping all HRM processes..."

# Stop PM2 processes
echo "Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill Node.js processes (including dev server)
echo "Killing Node.js processes..."
pkill -f "node.*server.ts" 2>/dev/null || true
pkill -f "ts-node.*server.ts" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Kill Playwright processes
echo "Killing Playwright processes..."
pkill -f "playwright" 2>/dev/null || true
pkill -f "chromium" 2>/dev/null || true

# Kill Chrome DevTools MCP
echo "Killing Chrome DevTools MCP..."
pkill -f "chrome-devtools-mcp" 2>/dev/null || true

# Kill any remaining Chrome processes
echo "Killing Chrome processes..."
pkill -f "chrome" 2>/dev/null || true

# Wait for processes to terminate
sleep 2

# Check if ports are still in use and kill them
echo "Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "✅ All processes stopped"