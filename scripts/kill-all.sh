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
pkill -f "node_modules/.bin/playwright" 2>/dev/null || true
pkill -f "chromium" 2>/dev/null || true

# Kill Chrome DevTools MCP
echo "Killing Chrome DevTools MCP..."
pkill -f "chrome-devtools-mcp" 2>/dev/null || true

# Kill only isolated Chrome browsers on 127.0.0.1:9222 (remote debugging)
echo "Killing isolated Chrome browsers (remote debugging on 127.0.0.1:9222)..."
# Find Chrome processes listening on port 9222 specifically
chrome_pids=$(lsof -ti:9222 2>/dev/null | grep -E '^[0-9]+$')
if [ ! -z "$chrome_pids" ]; then
    for pid in $chrome_pids; do
        # Double-check this is a Chrome process with remote debugging
        if ps -p $pid -o cmd= 2>/dev/null | grep -q "chrome.*--remote-debugging-port=9222"; then
            echo "Killing Chrome remote debugging process (PID: $pid)"
            kill -9 $pid >/dev/null 2>&1
        fi
    done
else
    echo "No Chrome remote debugging processes found on port 9222"
fi

# Wait for processes to terminate
sleep 2

# Check if ports are still in use and kill them
echo "Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "✅ All processes stopped"
echo ""
echo "Note: Only killed isolated Chrome browsers (remote debugging on 127.0.0.1:9222)"
echo "Your regular Chrome browser sessions remain untouched."